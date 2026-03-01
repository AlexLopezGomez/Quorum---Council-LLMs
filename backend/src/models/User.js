import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { decrypt } from '../utils/encryption.js';

const SALT_ROUNDS = 12;

const encryptedKeySchema = new mongoose.Schema(
  { iv: String, encrypted: String, authTag: String },
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
      required: true,
    },
    apiKeys: {
      openai: { type: encryptedKeySchema, default: undefined },
      anthropic: { type: encryptedKeySchema, default: undefined },
      google: { type: encryptedKeySchema, default: undefined },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, SALT_ROUNDS);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
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
