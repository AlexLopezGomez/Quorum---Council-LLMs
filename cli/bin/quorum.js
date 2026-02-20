#!/usr/bin/env node
import { Command } from 'commander';
import { runTest } from '../src/commands/test.js';
import { runInit } from '../src/commands/init.js';
import { runValidate } from '../src/commands/validate.js';

const program = new Command();

program
  .name('quorum')
  .description('Quorum CLI — adaptive AI evaluation for CI/CD')
  .version('0.1.0');

program
  .command('test')
  .description('Run evaluation against a Quorum backend')
  .option('-c, --config <path>', 'Path to .quorum.yml', '.quorum.yml')
  .option('-e, --endpoint <url>', 'Quorum backend URL', 'http://localhost:3000')
  .option('--ci', 'CI mode: JSON output, no colors/spinners')
  .option('--reporter <type>', 'Output format: terminal | markdown | json', 'terminal')
  .option('--update-baseline', 'Save this run as the new baseline')
  .option('--strategy <strategy>', 'Override strategy from config')
  .option('--timeout <ms>', 'Per-evaluation timeout in ms', (v) => parseInt(v, 10), 120000)
  .option('--email <email>', 'Auth email (or QUORUM_EMAIL env)')
  .option('--password <password>', 'Auth password (or QUORUM_PASSWORD env)')
  .action(async (options) => {
    try {
      const code = await runTest(options);
      process.exit(code);
    } catch (err) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Scaffold .quorum.yml and example dataset in current directory')
  .action(() => {
    const { created, skipped } = runInit();
    created.forEach((f) => console.log(`Created: ${f}`));
    skipped.forEach((f) => console.log(`Skipped (already exists): ${f}`));
    console.log('\nRun `quorum validate` to check your config.');
  });

program
  .command('validate')
  .description('Validate config and dataset files')
  .option('-c, --config <path>', 'Path to .quorum.yml', '.quorum.yml')
  .action((options) => {
    try {
      const result = runValidate(options);
      if (result.valid) {
        console.log(`Config valid. ${result.datasetCount} dataset(s) found.`);
        result.warnings.forEach((w) => console.warn(`Warning: ${w}`));
      } else {
        result.errors.forEach((e) => console.error(`Error: ${e}`));
        process.exit(1);
      }
    } catch (err) {
      console.error(`Validation failed: ${err.message}`);
      process.exit(1);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
