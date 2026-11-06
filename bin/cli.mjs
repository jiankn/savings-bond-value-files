#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { fetchValuePeriod, normalizeRows, toCsv } from '../src/index.mjs';

try {
  const { values } = parseArgs({ options: { period: { type: 'string' }, input: { type: 'string' }, format: { type: 'string', default: 'json' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' } } });
  if (values.help) {
    console.log('Usage: savings-bond-values --period YYYY-MM [--format json|csv]\n       savings-bond-values --input treasury-response.json [--format json|csv]\nReads official sb_value data. Amounts are integer cents per $25 face value.');
  } else if (values.version) {
    console.log('0.1.0');
  } else {
    if (!['json', 'csv'].includes(values.format)) throw new Error('Format must be json or csv.');
    if (Boolean(values.period) === Boolean(values.input)) throw new Error('Choose exactly one of --period or --input.');
    let periods;
    if (values.input) {
      const payload = JSON.parse(await readFile(values.input, 'utf8'));
      periods = normalizeRows(Array.isArray(payload) ? payload : payload.data);
    } else periods = [await fetchValuePeriod(values.period)];
    process.stdout.write(values.format === 'csv' ? toCsv(periods) : `${JSON.stringify(periods, null, 2)}\n`);
  }
} catch (error) {
  console.error(`savings-bond-values: ${error.message}`);
  process.exitCode = 1;
}
