import { createHash } from 'crypto';
import { AppLog } from '../models/AppLog.js';
import { AuditEvent } from '../models/AuditEvent.js';

const LOG_PERSIST = process.env.LOG_PERSIST === 'true';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'secret',
  'set-cookie',
]);

function redactValue(value) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    if (value.toLowerCase().startsWith('bearer ')) return '[REDACTED]';
    return value;
  }

  if (Array.isArray(value)) return value.map((item) => redactValue(item));

  if (typeof value === 'object') {
    const redacted = {};
    for (const [key, nested] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactValue(nested);
      }
    }
    return redacted;
  }

  return value;
}

function getRequestContext(req) {
  if (!req) return {};
  return {
    requestId: req.requestId,
    path: req.originalUrl || req.path,
    method: req.method,
    userId: req.user?._id,
    ipAddress: req.ip,
    userAgent: req.headers?.['user-agent'],
    durationMs: typeof req.startedAt === 'number' ? Date.now() - req.startedAt : undefined,
  };
}

function formatLogEntry(level, event, context = {}) {
  const safeContext = redactValue(context);
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeContext,
  };
}

function writeConsole(level, entry) {
  const payload = JSON.stringify(entry);
  if (level === 'error') {
    console.error(payload);
  } else if (level === 'warn') {
    console.warn(payload);
  } else {
    console.log(payload);
  }
}

async function persistEntry(level, event, context) {
  if (!LOG_PERSIST) return;

  const baseDoc = {
    level,
    event,
    requestId: context.requestId,
    userId: context.userId,
    jobId: context.jobId,
    path: context.path,
    method: context.method,
    statusCode: context.statusCode,
    durationMs: context.durationMs,
    metadata: context.metadata || {},
  };

  if (level === 'audit') {
    const hashedIp = context.ipAddress
      ? createHash('sha256').update(context.ipAddress).digest('hex')
      : undefined;
    await AuditEvent.create({
      ...baseDoc,
      level: 'audit',
      actor: context.actor || (context.userId ? 'user' : 'system'),
      ipAddress: hashedIp,
    });
    return;
  }

  await AppLog.create(baseDoc);
}

function log(level, event, context = {}) {
  const entry = formatLogEntry(level, event, context);
  writeConsole(level, entry);
  persistEntry(level, event, entry).catch(() => {});
}

function withReq(req, extra = {}) {
  return {
    ...getRequestContext(req),
    ...extra,
  };
}

export const logger = {
  info(event, context = {}) {
    log('info', event, context);
  },
  warn(event, context = {}) {
    log('warn', event, context);
  },
  error(event, context = {}) {
    log('error', event, context);
  },
  audit(event, context = {}) {
    log('audit', event, context);
  },
  withReq,
  redactValue,
};
