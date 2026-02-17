import mongoose from 'mongoose';

const webhookSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    secret: { type: String, default: null },
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
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

webhookSchema.index({ userId: 1, active: 1 });
webhookSchema.index({ active: 1 });

export const Webhook = mongoose.model('Webhook', webhookSchema);
