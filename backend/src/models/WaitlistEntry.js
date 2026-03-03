import mongoose from 'mongoose';

const waitlistEntrySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
  },
  { timestamps: true }
);

waitlistEntrySchema.index({ createdAt: -1 });

export default mongoose.model('WaitlistEntry', waitlistEntrySchema);
