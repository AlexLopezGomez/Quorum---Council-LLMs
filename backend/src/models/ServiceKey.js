import mongoose from 'mongoose';

const serviceKeySchema = new mongoose.Schema(
  {
    keyHash: { type: String, required: true, unique: true, index: true },
    keyPrefix: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scopes: { type: [String], default: ['ingest'] },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

serviceKeySchema.virtual('isActive').get(function () {
  return this.revokedAt === null || this.revokedAt === undefined;
});

export const ServiceKey = mongoose.model('ServiceKey', serviceKeySchema);
