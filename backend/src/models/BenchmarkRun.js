import mongoose from 'mongoose';

const caseResultSchema = new mongoose.Schema({
  caseId: String,
  domain: String,
  difficulty: String,
  input: String,
  humanVerdict: String,
  failureMode: String,
  council: {
    verdict: String,
    score: Number,
    correct: Boolean,
    cost: Number,
    latency: Number,
  },
  singleOpenai: {
    verdict: String,
    score: Number,
    correct: Boolean,
    cost: Number,
    latency: Number,
  },
  singleGemini: {
    verdict: String,
    score: Number,
    correct: Boolean,
    cost: Number,
    latency: Number,
  },
}, { _id: false });

const evaluatorStatsSchema = new mongoose.Schema({
  accuracy: Number,
  precision: Number,
  recall: Number,
  f1: Number,
  fnr: Number,
  brierScore: Number,
  cohensKappa: Number,
  kappaCI95: { lower: Number, upper: Number },
  avgCost: Number,
  avgLatency: Number,
  perDomain: mongoose.Schema.Types.Mixed,
}, { _id: false });

const batchStatusSchema = new mongoose.Schema({
  openai: { type: String, enum: ['pending', 'complete', 'failed'], default: 'pending' },
  anthropic: { type: String, enum: ['pending', 'complete', 'failed'], default: 'pending' },
  gemini: { type: String, enum: ['pending', 'complete', 'failed'], default: 'pending' },
}, { _id: false });

const benchmarkRunSchema = new mongoose.Schema({
  runId: { type: String, unique: true, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    enum: ['submitting', 'polling', 'aggregating', 'processing', 'complete', 'failed'],
    default: 'processing',
  },
  datasetVersion: { type: String, default: '1.0' },
  totalCases: Number,
  processedCases: { type: Number, default: 0 },
  // Batch API fields
  batchIds: {
    openai: String,
    anthropic: String,
    gemini: String,
  },
  batchStatus: batchStatusSchema,
  dataset: { type: mongoose.Schema.Types.Mixed, select: false }, // stored for aggregation phase, not returned by default
  results: [caseResultSchema],
  statistics: {
    council: evaluatorStatsSchema,
    singleOpenai: evaluatorStatsSchema,
    singleGemini: evaluatorStatsSchema,
    councilVsSingleOpenaiDelta: Number,
    councilVsSingleOpenaiFnrDelta: Number,
    mcnemarPValueVsOpenai: Number,
    mcnemarPValueVsGemini: Number,
    statisticallySignificantVsOpenai: Boolean,
    statisticallySignificantVsGemini: Boolean,
    totalCases: Number,
    passCases: Number,
    failCases: Number,
  },
  events: [{ type: { type: String }, data: mongoose.Schema.Types.Mixed, timestamp: { type: Date, default: Date.now } }],
  completedAt: Date,
}, { timestamps: true });

benchmarkRunSchema.index({ userId: 1, createdAt: -1 });

export const BenchmarkRun = mongoose.model('BenchmarkRun', benchmarkRunSchema);
