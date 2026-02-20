import { readFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import { testSuiteConfigSchema } from './schema.js';

export function parseYamlConfig(content, sourceName = 'config') {
  let raw;
  try {
    raw = yaml.load(content);
  } catch (err) {
    throw new Error(`Invalid YAML in ${sourceName}: ${err.message}`);
  }
  const result = testSuiteConfigSchema.safeParse(raw);
  if (!result.success) {
    const fields = result.error.errors.map((e) => `  ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Config validation failed in ${sourceName}:\n${fields}`);
  }
  return result.data;
}

export function loadConfig(configPath) {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  return parseYamlConfig(readFileSync(configPath, 'utf-8'), configPath);
}
