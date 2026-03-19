import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { decrypt } from '../utils/encryption.js';

const encryptedKeySchema = new mongoose.Schema(
  {
    iv: { type: String, required: true, minlength: 24, maxlength: 24 },
    encrypted: { type: String, required: true, minlength: 2 },
    authTag: { type: String, required: true, minlength: 32, maxlength: 32 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    passwordHash: {
      type: String,
      required: false,
      maxlength: 255,
    },
    firebaseUid: {
      type: String,
      index: true,
      sparse: true,
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    loginFailures: {
      type: Number,
      default: 0,
    },
    loginLockedUntil: {
      type: Date,
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
    },
    apiKeys: {
      openai: { type: encryptedKeySchema, default: undefined },
      anthropic: { type: encryptedKeySchema, default: undefined },
      google: { type: encryptedKeySchema, default: undefined },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    emailVerified: this.emailVerified,
    provider: this.provider,
    createdAt: this.createdAt,
  };
};

userSchema.methods.getDecryptedApiKeys = function () {
  const result = { openai: null, anthropic: null, google: null };
  for (const p of ['openai', 'anthropic', 'google']) {
    if (this.apiKeys?.[p]) {
      result[p] = decrypt(this.apiKeys[p]);
    }
  }
  return result;
};

export const User = mongoose.model('User', userSchema);
