import mongoose from 'mongoose';
import { decrypt } from '../utils/encryption.js';

const encryptedSecretSchema = new mongoose.Schema(
  {
    iv: { type: String, required: true, minlength: 24, maxlength: 24 },
    encrypted: { type: String, required: true, minlength: 2 },
    authTag: { type: String, required: true, minlength: 32, maxlength: 32 },
  },
  { _id: false }
);

const webhookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    secret: { type: encryptedSecretSchema, default: null },
    events: [{
      type: String,
      enum: ['verdict_fail', 'score_below_threshold', 'high_risk_fail', 'cost_spike', 'evaluation_complete'],
    }],
    config: {
      scoreThreshold: { type: Number, default: 0.7, min: 0, max: 1 },
      costSpikeMultiplier: { type: Number, default: 2, min: 1 },
    },
    active: { type: Boolean, default: true },
    lastTriggered: { type: Date, default: null },
    failureCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

webhookSchema.index({ userId: 1, active: 1 });
webhookSchema.index({ active: 1 });

webhookSchema.methods.getDecryptedSecret = function () {
  if (!this.secret) return null;

  // Backward compatibility for legacy plaintext secrets.
  if (typeof this.secret === 'string') return this.secret;

  try {
    return decrypt(this.secret);
  } catch {
    return null;
  }
};

export const Webhook = mongoose.model('Webhook', webhookSchema);
