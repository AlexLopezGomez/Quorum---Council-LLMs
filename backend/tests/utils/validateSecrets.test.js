import { describe, it, expect } from 'vitest';
import { validateProductionSecrets } from '../../src/utils/validateSecrets.js';

const STRONG_JWT = 'x'.repeat(32);
const STRONG_KEY = 'a'.repeat(64);
const TLS_MONGO = 'mongodb://db.example.com:27017/quorum?tls=true';
const LOCAL_MONGO = 'mongodb://localhost:27017/quorum';

function withEnv(overrides, fn) {
  const saved = {};
  const toDelete = [];

  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) {
      toDelete.push(key);
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const key of toDelete) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    for (const [key, value] of Object.entries(saved)) {
      if (!toDelete.includes(key)) process.env[key] = value;
    }
  }
}

describe('validateProductionSecrets', () => {
  it('does not throw in non-production regardless of missing secrets', () => {
    withEnv({
      NODE_ENV: 'development',
      JWT_SECRET: undefined,
      API_KEY_ENCRYPTION_SECRET: undefined,
      MONGODB_URI: undefined,
    }, () => {
      expect(() => validateProductionSecrets()).not.toThrow();
    });
  });

  it('does not throw in production when all secrets are present', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_JWT,
      API_KEY_ENCRYPTION_SECRET: STRONG_KEY,
      MONGODB_URI: TLS_MONGO,
    }, () => {
      expect(() => validateProductionSecrets()).not.toThrow();
    });
  });

  it('throws in production when JWT_SECRET is missing', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: undefined,
      API_KEY_ENCRYPTION_SECRET: STRONG_KEY,
      MONGODB_URI: TLS_MONGO,
    }, () => {
      expect(() => validateProductionSecrets()).toThrow('JWT_SECRET');
    });
  });

  it('throws in production when API_KEY_ENCRYPTION_SECRET is missing', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_JWT,
      API_KEY_ENCRYPTION_SECRET: undefined,
      MONGODB_URI: TLS_MONGO,
    }, () => {
      expect(() => validateProductionSecrets()).toThrow('API_KEY_ENCRYPTION_SECRET');
    });
  });

  it('throws in production when MONGODB_URI is missing', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_JWT,
      API_KEY_ENCRYPTION_SECRET: STRONG_KEY,
      MONGODB_URI: undefined,
    }, () => {
      expect(() => validateProductionSecrets()).toThrow('MONGODB_URI');
    });
  });

  it('lists all missing secrets in the error message', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: undefined,
      API_KEY_ENCRYPTION_SECRET: undefined,
      MONGODB_URI: undefined,
    }, () => {
      expect(() => validateProductionSecrets()).toThrow(/JWT_SECRET.*API_KEY_ENCRYPTION_SECRET.*MONGODB_URI|MONGODB_URI.*API_KEY_ENCRYPTION_SECRET.*JWT_SECRET/);
    });
  });

  it('error message includes actionable guidance', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: undefined,
      API_KEY_ENCRYPTION_SECRET: STRONG_KEY,
      MONGODB_URI: TLS_MONGO,
    }, () => {
      expect(() => validateProductionSecrets()).toThrow(/environment variable/i);
    });
  });

  it('throws when JWT secret is too short', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'short-secret',
      API_KEY_ENCRYPTION_SECRET: STRONG_KEY,
      MONGODB_URI: TLS_MONGO,
    }, () => {
      expect(() => validateProductionSecrets()).toThrow(/JWT_SECRET must be at least 32 characters/i);
    });
  });

  it('throws when API key encryption secret is not valid hex', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_JWT,
      API_KEY_ENCRYPTION_SECRET: 'invalid',
      MONGODB_URI: TLS_MONGO,
    }, () => {
      expect(() => validateProductionSecrets()).toThrow(/64-character hex string/i);
    });
  });

  it('throws when non-local Mongo URI is missing TLS', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_JWT,
      API_KEY_ENCRYPTION_SECRET: STRONG_KEY,
      MONGODB_URI: 'mongodb://db.example.com:27017/quorum',
      ALLOW_INSECURE_MONGODB_TRANSPORT: undefined,
    }, () => {
      expect(() => validateProductionSecrets()).toThrow(/must enable TLS/i);
    });
  });

  it('allows local Mongo URI without TLS', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_JWT,
      API_KEY_ENCRYPTION_SECRET: STRONG_KEY,
      MONGODB_URI: LOCAL_MONGO,
    }, () => {
      expect(() => validateProductionSecrets()).not.toThrow();
    });
  });

  it('allows insecure Mongo transport when explicit override is set', () => {
    withEnv({
      NODE_ENV: 'production',
      JWT_SECRET: STRONG_JWT,
      API_KEY_ENCRYPTION_SECRET: STRONG_KEY,
      MONGODB_URI: 'mongodb://db.example.com:27017/quorum',
      ALLOW_INSECURE_MONGODB_TRANSPORT: 'true',
    }, () => {
      expect(() => validateProductionSecrets()).not.toThrow();
    });
  });
});
