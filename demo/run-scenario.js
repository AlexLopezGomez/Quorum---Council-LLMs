import { readFileSync } from 'fs';

const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:4000';
const scenarioFile = process.argv[2];

if (!scenarioFile) {
  console.error('Usage: node run-scenario.js <scenario-file>');
  console.error('Example: node run-scenario.js scenarios/silent-failures.json');
  process.exit(1);
}

const scenarios = JSON.parse(readFileSync(new URL(scenarioFile, import.meta.url), 'utf-8'));

console.log(`Running ${scenarios.length} test cases from ${scenarioFile}\n`);

for (let i = 0; i < scenarios.length; i++) {
  const tc = scenarios[i];

  const body = { query: tc.input };
  if (tc.expectedOutput) body.expectedOutput = tc.expectedOutput;
  if (tc.metadata) body.metadata = tc.metadata;

  try {
    const res = await fetch(`${CHATBOT_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`  [${i + 1}] FAILED (HTTP ${res.status})`);
      continue;
    }

    const data = await res.json();
    const preview = data.answer?.substring(0, 80) || 'no answer';
    console.log(`  [${i + 1}] ${tc.input.substring(0, 50)}...`);
    console.log(`       → ${preview}...`);
    console.log(`       (${data.retrievedDocuments} docs retrieved)\n`);
  } catch (err) {
    console.error(`  [${i + 1}] ERROR: ${err.message}`);
  }
}

console.log('All scenarios sent. SDK will auto-flush captures to Quorum.');
console.log('Check the Quorum dashboard for evaluation results.');

await new Promise(r => setTimeout(r, 3000));
