const REQUIRED_PRODUCTION_SECRETS = [
  'JWT_SECRET',
  'API_KEY_ENCRYPTION_SECRET',
  'MONGODB_URI',
];

function hasStrongJwtSecret(secret) {
  return typeof secret === 'string' && secret.length >= 32;
}

function hasValidEncryptionKey(secret) {
  return typeof secret === 'string' && /^[a-f0-9]{64}$/i.test(secret);
}

function isLocalMongoUri(uri) {
  if (typeof uri !== 'string') return false;
  return /mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1|::1)(?::\d+)?(?:[/?]|$)/i.test(uri);
}

function isMongoTlsEnabled(uri) {
  if (typeof uri !== 'string') return false;
  if (uri.startsWith('mongodb+srv://')) return true;
  return /[?&](tls|ssl)=true(?:[&#]|$)/i.test(uri);
}

export function validateProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_PRODUCTION_SECRETS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required production secrets: ${missing.join(', ')}. ` +
        'Set these environment variables before starting the server.'
    );
  }

  if (!hasStrongJwtSecret(process.env.JWT_SECRET)) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }

  if (!hasValidEncryptionKey(process.env.API_KEY_ENCRYPTION_SECRET)) {
    throw new Error('API_KEY_ENCRYPTION_SECRET must be a 64-character hex string in production.');
  }

  const mongoUri = process.env.MONGODB_URI;
  const allowInsecureMongoTransport = process.env.ALLOW_INSECURE_MONGODB_TRANSPORT === 'true';
  if (!allowInsecureMongoTransport && !isLocalMongoUri(mongoUri) && !isMongoTlsEnabled(mongoUri)) {
    throw new Error(
      'MONGODB_URI must enable TLS in production (use mongodb+srv:// or add ?tls=true). ' +
      'Set ALLOW_INSECURE_MONGODB_TRANSPORT=true only for trusted private networks.'
    );
  }
}
