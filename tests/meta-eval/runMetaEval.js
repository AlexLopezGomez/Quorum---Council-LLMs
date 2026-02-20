import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { parseArgs } from 'util';
import { join, dirname } from 'path';
import { evaluateThresholds } from '../../backend/src/evaluators/thresholdEvaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOLDEN_DIR = join(__dirname, '..', 'golden');
const BASELINES_DIR = join(__dirname, '..', 'baselines');
const DATASETS = ['coliving-factual.jsonl', 'coliving-hallucinations.jsonl', 'coliving-edge.jsonl'];
const THRESHOLDS = {
  faithfulness: { pass: 0.7, warn: 0.4 },
  groundedness: { pass: 0.7, warn: 0.4 },
  contextRelevancy: { pass: 0.6, warn: 0.3 },
  finalScore: { pass: 0.65, warn: 0.4 },
};
const COST_PER_DATASET = 0.035;

export function parseJsonlContent(content) {
  return content
    .replace(/^\uFEFF/, '')
    .split('\n')
    .filter((line) => line.trim())
    .map((line, i) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`Invalid JSON on line ${i + 1}: ${line.slice(0, 80)}`);
      }
    });
}

export function loadJsonl(filePath) {
  return parseJsonlContent(readFileSync(filePath, 'utf-8'));
}

export function extractCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  for (const h of headers) {
    const match = h.match(/quorum_token=([^;]+)/);
    if (match) return `quorum_token=${match[1]}`;
  }
  return null;
}

export function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function isInRange(score, range) {
  if (score === null || score === undefined) return false;
  if (range.min !== undefined && score < range.min) return false;
  if (range.max !== undefined && score > range.max) return false;
  return true;
}

export function checkScoresAgainstRanges(result, goldenCase) {
  const ranges = goldenCase.metadata?.expectedScoreRange || {};
  const METRIC_JUDGE = { faithfulness: 'openai', groundedness: 'anthropic', contextRelevancy: 'gemini' };
  const checks = {};
  for (const [metric, range] of Object.entries(ranges)) {
    const score =
      metric === 'finalScore'
        ? (result?.aggregator?.finalScore ?? null)
        : (result?.judges?.[METRIC_JUDGE[metric]]?.score ?? null);
    checks[metric] = { score, range, inRange: isInRange(score, range) };
  }
  return { checks, allInRange: Object.values(checks).every((c) => c.inRange) };
}

export function detectBorderline(score, range, tolerance = 0.1) {
  if (score === null || score === undefined) return false;
  if (range.min !== undefined && Math.abs(score - range.min) <= tolerance) return true;
  if (range.max !== undefined && Math.abs(score - range.max) <= tolerance) return true;
  return false;
}

async function authenticate(endpoint, email, password) {
  const res = await fetch(`${endpoint}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Authentication failed (${res.status}): ${await res.text()}`);
  const cookie = extractCookie(res.headers.get('set-cookie'));
  if (!cookie) throw new Error('No quorum_token cookie received after login');
  return cookie;
}

async function pollResults(endpoint, jobId, cookie, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const res = await fetch(`${endpoint}/api/results/${jobId}`, { headers: { Cookie: cookie } });
    if (res.status === 200) return res.json();
    if (res.status !== 202) throw new Error(`Polling error for ${jobId}: ${res.status}`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Timed out after ${timeout}ms waiting for job ${jobId}`);
}

async function evaluateDataset(endpoint, testCases, strategy, cookie) {
  const chunks = chunkArray(testCases, 10);
  const allResults = [];
  for (const chunk of chunks) {
    const res = await fetch(`${endpoint}/api/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ testCases: chunk, options: { strategy } }),
    });
    if (!res.ok) throw new Error(`Evaluate request failed: ${res.status}`);
    const { jobId } = await res.json();
    const data = await pollResults(endpoint, jobId, cookie);
    allResults.push(...(data.results || []));
  }
  return allResults;
}

async function runStrategy(endpoint, strategy, cookie) {
  const allResults = [];
  let overallInRange = 0;
  let overallTotal = 0;
  let totalCost = 0;

  console.log(`\nStrategy: ${strategy}`);

  for (const dataset of DATASETS) {
    const goldenCases = loadJsonl(join(GOLDEN_DIR, dataset));
    process.stdout.write(`  Category: ${dataset.replace('.jsonl', '')} (${goldenCases.length} cases) ... `);

    const results = await evaluateDataset(endpoint, goldenCases, strategy, cookie);
    const cost = results.reduce((sum, r) => sum + (r.strategyCost || 0), 0);
    totalCost += cost;

    let inRange = 0;
    const outOfRange = [];

    goldenCases.forEach((golden, i) => {
      const result = results[i];
      if (!result) return;
      const { allInRange, checks } = checkScoresAgainstRanges(result, golden);
      if (allInRange) {
        inRange++;
      } else {
        const bad = Object.entries(checks)
          .filter(([, c]) => !c.inRange)
          .map(([m, c]) => `${m} ${c.score?.toFixed(2) ?? 'null'} (expected ${JSON.stringify(c.range)})`);
        outOfRange.push({ id: golden.id || `case-${i}`, bad });
      }
      allResults.push({ golden, result, allInRange, checks });
    });

    overallInRange += inRange;
    overallTotal += goldenCases.length;
    console.log(`${inRange}/${goldenCases.length} (${Math.round((inRange / goldenCases.length) * 100)}%)`);
    outOfRange.forEach(({ id, bad }) => console.log(`      ${id}: ${bad.join(', ')}`));
    console.log(`    Cost: $${cost.toFixed(3)}`);
  }

  const pct = overallTotal > 0 ? Math.round((overallInRange / overallTotal) * 100) : 0;
  console.log(`\nOverall agreement: ${pct}% (${overallInRange}/${overallTotal})`);
  console.log(`Total cost: $${totalCost.toFixed(3)}`);

  if (pct < 70) {
    console.log('\n⚠ REVIEW NEEDED: Agreement below 70%.');
    const borderline = allResults.filter(({ golden, checks }) =>
      Object.entries(checks).some(([metric, c]) => {
        const range = golden.metadata?.expectedScoreRange?.[metric];
        return range && detectBorderline(c.score, range);
      })
    );
    if (borderline.length > 0) {
      console.log(`  ${borderline.length} cases are borderline (score within 0.1 of range boundary).`);
      console.log('  Consider widening expectedScoreRange for these cases.');
    }
    if (!existsSync(BASELINES_DIR)) mkdirSync(BASELINES_DIR, { recursive: true });
    const reviewPath = join(BASELINES_DIR, `review-needed-${strategy}-${Date.now()}.json`);
    writeFileSync(reviewPath, JSON.stringify(allResults.filter((r) => !r.allInRange), null, 2));
    console.log(`  Review cases saved to: ${reviewPath}`);
  }

  if (!existsSync(BASELINES_DIR)) mkdirSync(BASELINES_DIR, { recursive: true });
  const baselinePath = join(BASELINES_DIR, `meta-eval-${strategy}-${Date.now()}.json`);
  writeFileSync(baselinePath, JSON.stringify({ strategy, timestamp: new Date().toISOString(), results: allResults }, null, 2));
  console.log(`Baseline saved to: ${baselinePath}`);
}

async function main() {
  const { values: args } = parseArgs({
    args: process.argv.slice(2),
    options: {
      endpoint: { type: 'string', default: 'http://localhost:3000' },
      email: { type: 'string' },
      password: { type: 'string' },
      strategy: { type: 'string', default: 'council' },
      'confirm-cost': { type: 'boolean', default: false },
      yes: { type: 'boolean', default: false },
    },
  });

  const email = args.email || process.env.QUORUM_EMAIL;
  const password = args.password || process.env.QUORUM_PASSWORD;
  if (!email || !password) {
    throw new Error('Email and password required (--email/--password or QUORUM_EMAIL/QUORUM_PASSWORD env vars)');
  }

  const strategies = args.strategy === 'all' ? ['auto', 'single', 'hybrid', 'council'] : [args.strategy];
  const estimatedCost = DATASETS.length * strategies.length * COST_PER_DATASET;

  if (args.strategy === 'all' && !args['confirm-cost'] && !args.yes) {
    console.log(`⚠  --strategy all will run ${strategies.length} strategies × ${DATASETS.length} datasets.`);
    console.log(`Estimated cost: $${estimatedCost.toFixed(2)}`);
    console.log('Re-run with --confirm-cost or --yes to proceed.');
    process.exit(0);
  }

  console.log(`=== Quorum Meta-Evaluation Report ===`);
  console.log(`Estimated cost: $${estimatedCost.toFixed(2)}\n`);

  const cookie = await authenticate(args.endpoint, email, password);
  for (const strategy of strategies) {
    await runStrategy(args.endpoint, strategy, cookie);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
