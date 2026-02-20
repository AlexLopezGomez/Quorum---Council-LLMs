import { resolve, dirname } from 'path';
import { loadConfig } from '../config/loader.js';
import { parseDataset } from '../dataset/parser.js';

export function runValidate(options = {}) {
  const configPath = resolve(options.config || '.quorum.yml');
  const configDir = dirname(configPath);
  const config = loadConfig(configPath);

  const errors = [];
  const warnings = [];

  for (const dataset of config.datasets) {
    try {
      const cases = parseDataset(dataset, configDir);
      if (cases.length === 0) warnings.push(`${dataset}: no test cases found`);
    } catch (err) {
      errors.push(`${dataset}: ${err.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    datasetCount: config.datasets.length,
    errors,
    warnings,
    config,
  };
}
