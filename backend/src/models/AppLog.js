import mongoose from 'mongoose';

const APP_LOG_TTL_DAYS = Number.parseInt(process.env.APP_LOG_TTL_DAYS || '30', 10);
const APP_LOG_TTL_SECONDS = Number.isFinite(APP_LOG_TTL_DAYS) && APP_LOG_TTL_DAYS > 0
  ? APP_LOG_TTL_DAYS * 24 * 60 * 60
  : 30 * 24 * 60 * 60;

const appLogSchema = new mongoose.Schema(
  {
    level: { type: String, enum: ['debug', 'info', 'warn', 'error'], required: true, index: true },
    event: { type: String, required: true, index: true },
    requestId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    jobId: { type: String, index: true },
    path: String,
    method: String,
    statusCode: Number,
    durationMs: Number,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

appLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: APP_LOG_TTL_SECONDS });
appLogSchema.index({ event: 1, createdAt: -1 });
appLogSchema.index({ requestId: 1, createdAt: -1 });
appLogSchema.index({ userId: 1, createdAt: -1 });
appLogSchema.index({ jobId: 1, createdAt: -1 });

export const AppLog = mongoose.model('AppLog', appLogSchema);
