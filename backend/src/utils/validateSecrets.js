const REQUIRED_PRODUCTION_SECRETS = [
  'JWT_SECRET',
  'API_KEY_ENCRYPTION_SECRET',
];

export function validateProductionSecrets() {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = REQUIRED_PRODUCTION_SECRETS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required production secrets: ${missing.join(', ')}. ` +
        'Set these environment variables before starting the server.'
    );
  }
}
