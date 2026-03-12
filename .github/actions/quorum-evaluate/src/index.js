/**
 * Quorum RAG Evaluation — GitHub Action
 *
 * Posts evaluation to Quorum API, polls for completion,
 * sets step outputs, posts PR comment if requested.
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

// ── GitHub Actions toolkit shim (no npm deps needed) ──────────
const core = {
  getInput: (name) => process.env[`INPUT_${name.toUpperCase().replace(/ /g, '_')}`] || '',
  setOutput: (name, value) => {
    const delimiter = Math.random().toString(36).slice(2);
    process.stdout.write(`::set-output name=${name}::${value}\n`);
  },
  setFailed: (msg) => { process.stderr.write(`::error::${msg}\n`); process.exit(1); },
  info: (msg) => process.stdout.write(`${msg}\n`),
  warning: (msg) => process.stdout.write(`::warning::${msg}\n`),
};

// ── Helpers ────────────────────────────────────────────────────
function request(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatVerdictEmoji(verdict) {
  if (verdict === 'PASS') return '✅';
  if (verdict === 'FAIL') return '❌';
  return '⚠️';
}

function buildPRComment(jobId, result, threshold, baseUrl) {
  const summary = result.summary || {};
  const passRate = summary.passRate || 0;
  const avgScore = summary.avgFinalScore || 0;
  const totalCost = summary.totalCost || 0;
  const overallVerdict = passRate / 100 >= threshold ? 'PASS' : 'FAIL';
  const emoji = formatVerdictEmoji(overallVerdict);

  const strategyCounts = summary.strategyCounts || {};
  const strategyLine = Object.entries(strategyCounts)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  const rows = (result.results || []).map(r => {
    const v = r.aggregator?.verdict || '—';
    const s = r.aggregator?.finalScore != null ? r.aggregator.finalScore.toFixed(2) : '—';
    const cost = r.strategyCost != null ? `$${r.strategyCost.toFixed(5)}` : '—';
    return `| ${r.testCaseIndex} | ${formatVerdictEmoji(v)} ${v} | ${s} | ${r.strategy || '—'} | ${cost} |`;
  }).join('\n');

  return `## Quorum RAG Evaluation Results ${emoji}

| Metric | Value |
|--------|-------|
| Overall | **${overallVerdict}** |
| Pass Rate | **${passRate}%** (threshold: ${Math.round(threshold * 100)}%) |
| Avg Score | ${avgScore.toFixed(2)} |
| Strategy | ${strategyLine || '—'} |
| Total Cost | $${totalCost.toFixed(6)} |
| Job ID | \`${jobId}\` |

<details>
<summary>Per Test Case Results (${(result.results || []).length} cases)</summary>

| # | Verdict | Score | Strategy | Cost |
|---|---------|-------|----------|------|
${rows}

</details>

[View full results →](${baseUrl}/app/history/${jobId})

> Evaluated by [Quorum](${baseUrl}) — Council of LLMs RAG evaluation`;
}

async function postPRComment(comment) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)\//)?.[1];

  if (!token || !repo || !prNumber) {
    core.warning('Cannot post PR comment: missing GITHUB_TOKEN, GITHUB_REPOSITORY, or PR context');
    return;
  }

  const [owner, repoName] = repo.split('/');
  const { status } = await request(
    'POST',
    `https://api.github.com/repos/${owner}/${repoName}/issues/${prNumber}/comments`,
    {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'quorum-evaluate-action',
    },
    { body: comment }
  );

  if (status < 300) {
    core.info('PR comment posted.');
  } else {
    core.warning(`Failed to post PR comment (status ${status})`);
  }
}

// ── Main ───────────────────────────────────────────────────────
async function run() {
  const apiKey = core.getInput('api_key');
  const testCasesPath = core.getInput('test_cases_path');
  const strategy = core.getInput('strategy') || 'auto';
  const failThreshold = parseFloat(core.getInput('fail_threshold') || '0.80');
  const postComment = core.getInput('post_comment') !== 'false';
  const baseUrl = (core.getInput('base_url') || 'https://app.quorum.ai').replace(/\/$/, '');
  const evalName = core.getInput('evaluation_name') || `CI run ${process.env.GITHUB_SHA?.slice(0, 7) || ''}`;

  if (!apiKey) {
    core.setFailed('api_key input is required');
    return;
  }

  // Load test cases
  let testCases;
  try {
    testCases = JSON.parse(fs.readFileSync(testCasesPath, 'utf-8'));
  } catch (err) {
    core.setFailed(`Cannot read test cases from ${testCasesPath}: ${err.message}`);
    return;
  }

  core.info(`Submitting ${testCases.length} test cases (strategy: ${strategy})...`);

  const authHeaders = { Authorization: `Bearer ${apiKey}` };

  // Submit evaluation
  const submitRes = await request('POST', `${baseUrl}/api/evaluate`, authHeaders, {
    testCases,
    name: evalName,
    options: { strategy },
  });

  if (submitRes.status !== 202) {
    core.setFailed(`Failed to start evaluation: ${JSON.stringify(submitRes.body)}`);
    return;
  }

  const { jobId } = submitRes.body;
  core.info(`Evaluation started: ${jobId}`);
  core.setOutput('job_id', jobId);
  core.setOutput('results_url', `${baseUrl}/app/history/${jobId}`);

  // Poll for completion (max 10 minutes)
  const deadline = Date.now() + 10 * 60 * 1000;
  let result = null;

  while (Date.now() < deadline) {
    await sleep(3000);
    const pollRes = await request('GET', `${baseUrl}/api/results/${jobId}`, authHeaders);

    if (pollRes.status === 200 && pollRes.body?.status === 'complete') {
      result = pollRes.body;
      break;
    }
    if (pollRes.body?.status === 'failed') {
      core.setFailed(`Evaluation ${jobId} failed on the server`);
      return;
    }

    core.info(`Waiting... (${pollRes.body?.status || 'pending'})`);
  }

  if (!result) {
    core.setFailed('Evaluation timed out after 10 minutes');
    return;
  }

  // Extract metrics
  const summary = result.summary || {};
  const passRate = (summary.passRate || 0) / 100;
  const avgScore = summary.avgFinalScore || 0;
  const totalCost = summary.totalCost || 0;
  const overallVerdict = passRate >= failThreshold ? 'PASS' : 'FAIL';

  core.setOutput('verdict', overallVerdict);
  core.setOutput('pass_rate', passRate.toFixed(4));
  core.setOutput('avg_score', avgScore.toFixed(4));
  core.setOutput('total_cost', totalCost.toFixed(6));

  core.info(`\nEvaluation complete:`);
  core.info(`  Verdict:    ${overallVerdict}`);
  core.info(`  Pass rate:  ${Math.round(passRate * 100)}% (threshold: ${Math.round(failThreshold * 100)}%)`);
  core.info(`  Avg score:  ${avgScore.toFixed(2)}`);
  core.info(`  Total cost: $${totalCost.toFixed(6)}`);
  core.info(`  Results:    ${baseUrl}/app/history/${jobId}`);

  if (postComment) {
    const comment = buildPRComment(jobId, result, failThreshold, baseUrl);
    await postPRComment(comment);
  }

  if (overallVerdict === 'FAIL') {
    core.setFailed(
      `RAG evaluation failed: pass rate ${Math.round(passRate * 100)}% is below threshold ${Math.round(failThreshold * 100)}%`
    );
  }
}

run().catch(err => core.setFailed(err.message));
