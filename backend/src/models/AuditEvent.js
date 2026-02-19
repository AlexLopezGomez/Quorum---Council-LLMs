import mongoose from 'mongoose';

const AUDIT_TTL_DAYS = Number.parseInt(process.env.AUDIT_TTL_DAYS || '180', 10);
const AUDIT_TTL_SECONDS = Number.isFinite(AUDIT_TTL_DAYS) && AUDIT_TTL_DAYS > 0
  ? AUDIT_TTL_DAYS * 24 * 60 * 60
  : 180 * 24 * 60 * 60;

const auditEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, index: true },
    level: { type: String, default: 'audit', enum: ['audit'] },
    requestId: { type: String, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    jobId: { type: String, index: true },
    actor: {
      type: String,
      enum: ['user', 'system', 'webhook', 'sdk', 'unknown'],
      default: 'unknown',
      index: true,
    },
    ipAddress: String,
    userAgent: String,
    path: String,
    method: String,
    statusCode: Number,
    durationMs: Number,
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

auditEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: AUDIT_TTL_SECONDS });
auditEventSchema.index({ event: 1, createdAt: -1 });
auditEventSchema.index({ requestId: 1, createdAt: -1 });
auditEventSchema.index({ userId: 1, createdAt: -1 });
auditEventSchema.index({ jobId: 1, createdAt: -1 });

export const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
