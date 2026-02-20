import { readFileSync, existsSync } from 'fs';
import { resolve, extname } from 'path';

export function validateExtension(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext !== '.jsonl' && ext !== '.json') {
    throw new Error(`Unsupported file format "${ext}". Use .jsonl or .json`);
  }
  return ext;
}

function isBraceBalanced(str) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (const ch of str) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') depth--;
  }
  return depth === 0;
}

export function parseJsonlContent(content) {
  const lines = content.replace(/^\uFEFF/, '').split('\n');
  const results = [];
  let buffer = '';
  let bufferStartLine = 0;

  const tryFlush = () => {
    if (!buffer.trim()) return;
    try { results.push(JSON.parse(buffer)); buffer = ''; } catch { /* still accumulating */ }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    if (!line) { tryFlush(); continue; }

    if (!buffer) bufferStartLine = i + 1;
    buffer = buffer ? `${buffer}\n${line}` : line;

    if (!isBraceBalanced(buffer)) continue;

    try {
      results.push(JSON.parse(buffer));
      buffer = '';
    } catch {
      throw new Error(`Invalid JSON on line ${bufferStartLine}: ${buffer.slice(0, 80)}`);
    }
  }

  if (buffer.trim()) {
    try { results.push(JSON.parse(buffer)); }
    catch { throw new Error(`Invalid JSON on line ${bufferStartLine}: ${buffer.slice(0, 80)}`); }
  }

  return results;
}

export function parseJsonContent(content) {
  const parsed = JSON.parse(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed.testCases && Array.isArray(parsed.testCases)) return parsed.testCases;
  throw new Error('Unsupported JSON format. Expected an array or { testCases: [...] }');
}

export function parseDataset(filePath, configDir) {
  const absPath = resolve(configDir, filePath);
  if (!existsSync(absPath)) throw new Error(`Dataset file not found: ${absPath}`);
  const ext = validateExtension(absPath);
  const content = readFileSync(absPath, 'utf-8').replace(/^\uFEFF/, '');
  return ext === '.jsonl' ? parseJsonlContent(content) : parseJsonContent(content);
}
