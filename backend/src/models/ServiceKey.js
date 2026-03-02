import mongoose from 'mongoose';

const VALID_SCOPES = ['ingest', 'evaluate'];

const serviceKeySchema = new mongoose.Schema(
  {
    keyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      minlength: 64,
      maxlength: 64,
      match: /^[a-f0-9]{64}$/i,
    },
    keyPrefix: { type: String, required: true, trim: true, maxlength: 32 },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 100 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scopes: {
      type: [{ type: String, enum: VALID_SCOPES }],
      default: ['ingest'],
    },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

serviceKeySchema.virtual('isActive').get(function () {
  return this.revokedAt === null || this.revokedAt === undefined;
});

export const ServiceKey = mongoose.model('ServiceKey', serviceKeySchema);
