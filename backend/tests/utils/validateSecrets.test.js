import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateProductionSecrets } from '../../src/utils/validateSecrets.js';

const REQUIRED = ['JWT_SECRET', 'API_KEY_ENCRYPTION_SECRET'];

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
    withEnv({ NODE_ENV: 'development', JWT_SECRET: undefined, API_KEY_ENCRYPTION_SECRET: undefined }, () => {
      expect(() => validateProductionSecrets()).not.toThrow();
    });
  });

  it('does not throw in production when all secrets are present', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: 'real-secret', API_KEY_ENCRYPTION_SECRET: 'real-enc-secret' }, () => {
      expect(() => validateProductionSecrets()).not.toThrow();
    });
  });

  it('throws in production when JWT_SECRET is missing', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: undefined, API_KEY_ENCRYPTION_SECRET: 'real-enc-secret' }, () => {
      expect(() => validateProductionSecrets()).toThrow('JWT_SECRET');
    });
  });

  it('throws in production when API_KEY_ENCRYPTION_SECRET is missing', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: 'real-secret', API_KEY_ENCRYPTION_SECRET: undefined }, () => {
      expect(() => validateProductionSecrets()).toThrow('API_KEY_ENCRYPTION_SECRET');
    });
  });

  it('lists all missing secrets in the error message', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: undefined, API_KEY_ENCRYPTION_SECRET: undefined }, () => {
      expect(() => validateProductionSecrets()).toThrow(/JWT_SECRET.*API_KEY_ENCRYPTION_SECRET|API_KEY_ENCRYPTION_SECRET.*JWT_SECRET/);
    });
  });

  it('error message includes actionable guidance', () => {
    withEnv({ NODE_ENV: 'production', JWT_SECRET: undefined, API_KEY_ENCRYPTION_SECRET: 'x' }, () => {
      expect(() => validateProductionSecrets()).toThrow(/environment variable/i);
    });
  });
});
