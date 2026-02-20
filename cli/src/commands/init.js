import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, '..', '..', 'templates');

export function runInit(options = {}) {
  const targetDir = resolve(options.dir || '.');
  const configPath = join(targetDir, '.quorum.yml');
  const testsDir = join(targetDir, 'tests');
  const examplePath = join(testsDir, 'example.jsonl');

  const created = [];
  const skipped = [];

  if (!existsSync(configPath)) {
    writeFileSync(configPath, readFileSync(join(TEMPLATES_DIR, 'quorum.yml'), 'utf-8'));
    created.push('.quorum.yml');
  } else {
    skipped.push('.quorum.yml');
  }

  if (!existsSync(testsDir)) mkdirSync(testsDir, { recursive: true });

  if (!existsSync(examplePath)) {
    writeFileSync(examplePath, readFileSync(join(TEMPLATES_DIR, 'example.jsonl'), 'utf-8'));
    created.push('tests/example.jsonl');
  } else {
    skipped.push('tests/example.jsonl');
  }

  return { created, skipped };
}
