import mongoose from 'mongoose';

const driftAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    severity: {
      type: String,
      enum: ['warning', 'critical'],
      required: true,
    },
    drop: { type: Number, required: true },
    baselineMean: { type: Number, required: true },
    rollingMean: { type: Number, required: true },
  },
  { timestamps: true }
);

driftAlertSchema.index({ userId: 1, createdAt: -1 });

export const DriftAlert = mongoose.model('DriftAlert', driftAlertSchema);
