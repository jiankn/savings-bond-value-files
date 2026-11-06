import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { amountToCents, normalizeRows, lookupUnitValue, toCsv, fetchValuePeriod } from '../src/index.mjs';

const body = readFileSync(new URL('./fixtures/treasury-2023-05.json', import.meta.url), 'utf8');
const fixture = JSON.parse(body);
const provenance = JSON.parse(readFileSync(new URL('./fixtures/source.json', import.meta.url), 'utf8'));
const cli = new URL('../bin/cli.mjs', import.meta.url);
const input = new URL('./fixtures/treasury-2023-05.json', import.meta.url);
const { fileURLToPath } = await import('node:url');

test('official fixture digest and row count match the recorded source', () => {
  assert.equal(createHash('sha256').update(body).digest('hex'), provenance.sha256);
  assert.equal(fixture.data.length, provenance.rows);
  assert.equal(fixture.data.length, fixture.meta['total-count']);
});

test('recorded Treasury I bond cell is exactly 6400 cents', () => {
  const [period] = normalizeRows(fixture.data);
  assert.equal(lookupUnitValue(period, 'I', '2002-03'), 6400);
  assert.equal(period.denominationCents, 2500);
});

test('every official fixture amount converts exactly and preserves null and zero', () => {
  const [period] = normalizeRows(fixture.data);
  const codes = { E: 'E', N: 'EE', I: 'I', S: 'SN' };
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  for (const row of fixture.data) months.forEach((month, index) => {
    const source = row[`issue_${month}_amt`];
    const expected = source === null || source === 'null' ? null : Number(BigInt(source.replace('.', '')));
    assert.equal(period.series[codes[row.series_cd]][row.issue_year][index], expected);
  });
});

test('decimal parser handles safe boundaries without floating point', () => {
  assert.equal(amountToCents('0.00'), 0);
  assert.equal(amountToCents('0.29'), 29);
  assert.equal(amountToCents('90071992547409.91'), Number.MAX_SAFE_INTEGER);
  assert.equal(amountToCents(null), null);
  assert.equal(amountToCents('null'), null);
  assert.throws(() => amountToCents('90071992547409.92'), RangeError);
  for (const value of ['1.1', '-1.00', '1e3', '', undefined, 1.23]) assert.throws(() => amountToCents(value));
});

test('malformed rows and duplicate keys fail rather than overwrite', () => {
  const row = fixture.data[0];
  assert.throws(() => normalizeRows([row, row]), /Duplicate/);
  assert.throws(() => normalizeRows([{ ...row, series_cd: '__proto__' }]), /Unknown/);
  assert.throws(() => normalizeRows([{ ...row, redemp_period: '2023-13' }]), /YYYY-MM/);
  assert.throws(() => normalizeRows([{ ...row, issue_jan_amt: undefined }]));
  assert.throws(() => normalizeRows([]), /nonempty/);
});

test('lookup does not turn zero into null and rejects malformed months', () => {
  const [period] = normalizeRows(fixture.data);
  const zero = fixture.data.find(row => Object.values(row).includes('0.00'));
  assert.ok(zero);
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const index = months.findIndex(month => zero[`issue_${month}_amt`] === '0.00');
  assert.equal(lookupUnitValue(period, { E:'E',N:'EE',I:'I',S:'SN' }[zero.series_cd], `${zero.issue_year}-${String(index+1).padStart(2,'0')}`), 0);
  assert.equal(lookupUnitValue(period, 'I', '1000-01'), null);
  assert.throws(() => lookupUnitValue(period, 'I', '2023-00'));
});

test('CSV exports all official cells with distinct empty and zero cells', () => {
  const csv = toCsv(normalizeRows(fixture.data));
  assert.equal(csv.trimEnd().split('\n').length, fixture.data.length * 12 + 1);
  assert.match(csv, /2023-05,I,2002-03,6400,2500/);
  assert.match(csv, /,0,2500/);
  assert.match(csv, /,,2500/);
  assert.doesNotMatch(csv, /NaN|undefined/);
});

const response = payload => ({ ok: true, status: 200, json: async () => payload });

test('fetch attaches provenance and uses the requested official period', async () => {
  const period = await fetchValuePeriod('2023-05', { fetchImpl: async url => {
    assert.equal(url.searchParams.get('filter'), 'redemp_period:eq:2023-05');
    return response(fixture);
  } });
  assert.equal(lookupUnitValue(period, 'I', '2002-03'), 6400);
  assert.equal(period.rowCount, fixture.data.length);
  assert.match(period.sourceUrl, /^https:\/\/api\.fiscaldata\.treasury\.gov\//);
  assert.ok(Date.parse(period.retrievedAt));
});

test('fetch rejects unavailable months and HTTP failures', async () => {
  await assert.rejects(fetchValuePeriod('2023-05', {fetchImpl: async () => response({data:[], meta:{'total-count':0,'total-pages':0}})}), /No official/);
  await assert.rejects(fetchValuePeriod('2023-05', {fetchImpl: async () => ({ok:false,status:503})}), /503/);
  await assert.rejects(fetchValuePeriod('2023-99'), /YYYY-MM/);
});

test('fetch rejects incomplete pages, unexpected periods and inconsistent metadata', async () => {
  await assert.rejects(fetchValuePeriod('2023-05', {fetchImpl: async () => response({...fixture,data:fixture.data.slice(1)})}), /Incomplete/);
  await assert.rejects(fetchValuePeriod('2023-04', {fetchImpl: async () => response(fixture)}), /unexpected/);
  await assert.rejects(fetchValuePeriod('2023-05', {fetchImpl: async () => response({...fixture,meta:{'total-count':2,'total-pages':2}})}), /page count/);
});

test('CLI offline JSON and CSV use the same official cells', () => {
  const args = [fileURLToPath(cli), '--input', fileURLToPath(input)];
  const json = JSON.parse(execFileSync(process.execPath, args, {encoding:'utf8'}));
  assert.equal(lookupUnitValue(json[0], 'I', '2002-03'), 6400);
  const csv = execFileSync(process.execPath, [...args, '--format','csv'], {encoding:'utf8'});
  assert.match(csv, /2023-05,I,2002-03,6400,2500/);
});

test('CLI rejects ambiguous inputs, unsupported formats and missing files', () => {
  for (const args of [[], ['--period','2023-05','--input','x'], ['--period','2023-05','--format','xml'], ['--input','does-not-exist.json']]) {
    const result = spawnSync(process.execPath, [fileURLToPath(cli), ...args], {encoding:'utf8'});
    assert.equal(result.status, 1);
    assert.match(result.stderr, /savings-bond-values:/);
  }
});
