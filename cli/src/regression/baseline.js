import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

export function readBaseline(filePath) {
  if (!filePath || !existsSync(filePath)) return null;
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    return Array.isArray(data) ? data : (data.results ?? null);
  } catch {
    return null;
  }
}

export function writeBaseline(filePath, results) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2));
}

export function buildBaselinePath(baseDirPath) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return join(baseDirPath, `baseline-${ts}.json`);
}

export function findLatestBaseline(baseDirPath) {
  if (!existsSync(baseDirPath)) return null;
  const files = readdirSync(baseDirPath)
    .filter((f) => f.startsWith('baseline-') && f.endsWith('.json'))
    .sort()
    .reverse();
  return files.length > 0 ? join(baseDirPath, files[0]) : null;
}
