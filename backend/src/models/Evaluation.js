import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema(
  {
    input: { type: String, required: true },
    actualOutput: { type: String, required: true },
    expectedOutput: { type: String },
    retrievalContext: [{ type: String }],
  },
  { _id: false }
);

const judgeResultSchema = new mongoose.Schema(
  {
    judge: String,
    metric: String,
    model: String,
    score: Number,
    reason: String,
    details: mongoose.Schema.Types.Mixed,
    tokens: {
      input: Number,
      output: Number,
      total: Number,
    },
    cost: Number,
    latency: Number,
    error: String,
  },
  { _id: false }
);

const aggregatorResultSchema = new mongoose.Schema(
  {
    model: String,
    finalScore: Number,
    verdict: { type: String, enum: ['PASS', 'WARN', 'FAIL', 'ERROR'] },
    synthesis: String,
    disagreements: [String],
    recommendation: String,
    tokens: {
      input: Number,
      output: Number,
      total: Number,
    },
    cost: Number,
    latency: Number,
    error: String,
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    testCaseIndex: Number,
    judges: mongoose.Schema.Types.Mixed,
    aggregator: aggregatorResultSchema,
    strategy: { type: String, enum: ['council', 'hybrid', 'single'] },
    riskScore: Number,
    riskFactors: [String],
    deterministicChecks: mongoose.Schema.Types.Mixed,
    strategyCost: Number,
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const summarySchema = new mongoose.Schema(
  {
    avgFaithfulness: Number,
    avgGroundedness: Number,
    avgRelevancy: Number,
    avgFinalScore: Number,
    passRate: Number,
    totalCost: Number,
    strategyCounts: mongoose.Schema.Types.Mixed,
    costByStrategy: mongoose.Schema.Types.Mixed,
    avgRiskScore: Number,
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['processing', 'complete', 'failed'],
    default: 'processing',
  },
  testCases: [testCaseSchema],
  results: [resultSchema],
  events: [eventSchema],
  summary: summarySchema,
  config: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  completedAt: Date,
});

evaluationSchema.index({ createdAt: -1 });
evaluationSchema.index({ status: 1 });
evaluationSchema.index({ status: 1, completedAt: -1 });

export const Evaluation = mongoose.model('Evaluation', evaluationSchema);
