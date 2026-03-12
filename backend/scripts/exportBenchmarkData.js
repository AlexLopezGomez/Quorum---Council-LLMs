#!/usr/bin/env node
/**
 * Export benchmark results from MongoDB to CSV + JSON for paper analysis.
 *
 * Usage: node backend/scripts/exportBenchmarkData.js
 *
 * Outputs:
 *   paper/data/benchmark_results.csv   — per-case results
 *   paper/data/aggregate_stats.json    — computed statistics
 */

import mongoose from 'mongoose';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const OUT_DIR = join(__dirname, '../../paper/data');
mkdirSync(OUT_DIR, { recursive: true });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quorum-dev';

const caseResultSchema = new mongoose.Schema({
  caseId: String, domain: String, difficulty: String, input: String,
  humanVerdict: String, failureMode: String,
  council: { verdict: String, score: Number, correct: Boolean, cost: Number, latency: Number },
  singleOpenai: { verdict: String, score: Number, correct: Boolean, cost: Number, latency: Number },
  singleGemini: { verdict: String, score: Number, correct: Boolean, cost: Number, latency: Number },
}, { _id: false });

const BenchmarkRun = mongoose.model('BenchmarkRun', new mongoose.Schema({
  runId: String, status: String, datasetVersion: String,
  totalCases: Number, processedCases: Number,
  results: [caseResultSchema],
  statistics: mongoose.Schema.Types.Mixed,
  completedAt: Date,
}, { timestamps: true, strict: false }));

function escapeCSV(val) {
  if (val == null) return '';
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const run = await BenchmarkRun.findOne({ status: 'complete' })
    .sort({ completedAt: -1 })
    .lean();

  if (!run) {
    console.error('No completed benchmark runs found.');
    process.exit(1);
  }

  console.log(`Found run ${run.runId} (${run.results.length} cases, completed ${run.completedAt})`);

  // CSV export
  const headers = [
    'caseId', 'domain', 'difficulty', 'humanVerdict', 'failureMode',
    'councilVerdict', 'councilScore', 'councilCorrect', 'councilCost', 'councilLatency',
    'openaiVerdict', 'openaiScore', 'openaiCorrect', 'openaiCost', 'openaiLatency',
    'geminiVerdict', 'geminiScore', 'geminiCorrect', 'geminiCost', 'geminiLatency',
  ];

  const rows = run.results.map(r => [
    r.caseId, r.domain, r.difficulty || '', r.humanVerdict, r.failureMode || '',
    r.council?.verdict, r.council?.score, r.council?.correct, r.council?.cost, r.council?.latency,
    r.singleOpenai?.verdict, r.singleOpenai?.score, r.singleOpenai?.correct, r.singleOpenai?.cost, r.singleOpenai?.latency,
    r.singleGemini?.verdict, r.singleGemini?.score, r.singleGemini?.correct, r.singleGemini?.cost, r.singleGemini?.latency,
  ].map(escapeCSV));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  writeFileSync(join(OUT_DIR, 'benchmark_results.csv'), csv, 'utf-8');
  console.log(`Wrote ${run.results.length} rows to paper/data/benchmark_results.csv`);

  // JSON aggregate stats
  const stats = {
    runId: run.runId,
    datasetVersion: run.datasetVersion,
    completedAt: run.completedAt,
    totalCases: run.results.length,
    passCases: run.results.filter(r => r.humanVerdict === 'PASS').length,
    failCases: run.results.filter(r => r.humanVerdict === 'FAIL').length,
    statistics: run.statistics,
  };
  writeFileSync(join(OUT_DIR, 'aggregate_stats.json'), JSON.stringify(stats, null, 2), 'utf-8');
  console.log('Wrote paper/data/aggregate_stats.json');

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
