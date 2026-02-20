import { describe, it, expect } from 'vitest';
import { parseYamlConfig } from '../../src/config/loader.js';

const VALID_MINIMAL = `
version: 1
datasets:
  - data.jsonl
metrics:
  faithfulness:
    pass: 0.7
    warn: 0.4
`.trim();

const VALID_FULL = `
version: 1
datasets:
  - a.jsonl
  - b.jsonl
metrics:
  faithfulness:
    pass: 0.8
    warn: 0.5
  groundedness:
    pass: 0.75
    warn: 0.4
strategy: council
ci:
  failOnWarn: true
  regressionThreshold: 0.1
`.trim();

describe('parseYamlConfig', () => {
  it('parses valid minimal config correctly', () => {
    const config = parseYamlConfig(VALID_MINIMAL);
    expect(config.version).toBe(1);
    expect(config.datasets).toEqual(['data.jsonl']);
    expect(config.metrics.faithfulness.pass).toBe(0.7);
  });

  it('parses full config with all fields', () => {
    const config = parseYamlConfig(VALID_FULL);
    expect(config.strategy).toBe('council');
    expect(config.ci.failOnWarn).toBe(true);
    expect(config.ci.regressionThreshold).toBe(0.1);
    expect(config.datasets).toHaveLength(2);
  });

  it('applies defaults for omitted optional fields', () => {
    const config = parseYamlConfig(VALID_MINIMAL);
    expect(config.strategy).toBe('auto');
    expect(config.ci.failOnWarn).toBe(false);
    expect(config.ci.failOnError).toBe(true);
    expect(config.ci.failOnRegression).toBe(false);
    expect(config.ci.regressionThreshold).toBe(0.05);
  });

  it('throws with "YAML" in message for invalid YAML syntax', () => {
    expect(() => parseYamlConfig('version: 1\n  invalid: [yaml: here', 'test.yml')).toThrow(/YAML/i);
  });

  it('throws with field path when version is wrong', () => {
    const bad = 'version: 2\ndatasets:\n  - a.jsonl\nmetrics:\n  faithfulness:\n    pass: 0.7\n    warn: 0.4\n';
    expect(() => parseYamlConfig(bad)).toThrow(/version/);
  });

  it('throws when metrics object is empty', () => {
    const bad = 'version: 1\ndatasets:\n  - a.jsonl\nmetrics: {}\n';
    expect(() => parseYamlConfig(bad)).toThrow(/metric/i);
  });

  it('throws when datasets is empty array', () => {
    const bad = 'version: 1\ndatasets: []\nmetrics:\n  faithfulness:\n    pass: 0.7\n    warn: 0.4\n';
    expect(() => parseYamlConfig(bad)).toThrow();
  });

  it('throws with "Config validation failed" prefix on schema error', () => {
    const bad = 'version: 99\ndatasets:\n  - a.jsonl\nmetrics:\n  faithfulness:\n    pass: 0.7\n    warn: 0.4\n';
    expect(() => parseYamlConfig(bad, 'myconfig.yml')).toThrow(/Config validation failed/);
  });
});
