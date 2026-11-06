export const SOURCE_URL = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/sb_value';
export const DATASET_URL = 'https://fiscaldata.treasury.gov/datasets/savings-bond-value-files/';
const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const seriesCodes = { E: 'E', N: 'EE', I: 'I', S: 'SN' };

function assertMonth(value) {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new TypeError('Expected a month in YYYY-MM format.');
}

export function amountToCents(value) {
  if (value === null || value === 'null') return null;
  if (typeof value !== 'string' || !/^\d+\.\d{2}$/.test(value)) throw new TypeError('Expected a nonnegative decimal string with two places, or null.');
  const [dollars, cents] = value.split('.');
  const total = BigInt(dollars) * 100n + BigInt(cents);
  if (total > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Amount exceeds the safe integer range.');
  return Number(total);
}

export function normalizeRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new TypeError('Expected a nonempty array of Treasury sb_value rows.');
  const periods = new Map();
  for (const row of rows) {
    if (!row || typeof row !== 'object') throw new TypeError('Invalid Treasury row.');
    assertMonth(row.redemp_period);
    if (!Object.hasOwn(seriesCodes, row.series_cd) || typeof row.issue_year !== 'string' || !/^\d{4}$/.test(row.issue_year)) throw new TypeError('Unknown series code or invalid issue year.');
    const series = seriesCodes[row.series_cd];
    if (!periods.has(row.redemp_period)) periods.set(row.redemp_period, { period: row.redemp_period, units: 'cents', denominationCents: 2500, series: { E: {}, EE: {}, I: {}, SN: {} } });
    const years = periods.get(row.redemp_period).series[series];
    if (Object.hasOwn(years, row.issue_year)) throw new Error(`Duplicate row: ${row.redemp_period}/${series}/${row.issue_year}.`);
    years[row.issue_year] = months.map(month => amountToCents(row[`issue_${month}_amt`]));
  }
  return [...periods.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export function lookupUnitValue(period, series, issue) {
  assertMonth(issue);
  if (!['E', 'EE', 'I', 'SN'].includes(series)) throw new TypeError('Expected E, EE, I or SN.');
  const value = period?.series?.[series]?.[issue.slice(0, 4)]?.[Number(issue.slice(5)) - 1];
  return value ?? null;
}

export function toCsv(periods) {
  const lines = ['redemption_period,series,issue_month,unit_value_cents,denomination_cents'];
  for (const period of periods) {
    assertMonth(period.period);
    for (const series of ['E', 'EE', 'I', 'SN']) {
      for (const year of Object.keys(period.series[series]).sort()) {
        period.series[series][year].forEach((value, i) => {
          lines.push(`${period.period},${series},${year}-${String(i + 1).padStart(2, '0')},${value ?? ''},2500`);
        });
      }
    }
  }
  return `${lines.join('\n')}\n`;
}

export async function fetchValuePeriod(period, { fetchImpl = globalThis.fetch, signal } = {}) {
  assertMonth(period);
  const rows = [];
  let totalCount;
  let totalPages;
  for (let number = 1; ; number++) {
    const url = new URL(SOURCE_URL);
    url.searchParams.set('filter', `redemp_period:eq:${period}`);
    url.searchParams.set('sort', 'src_line_nbr');
    url.searchParams.set('page[size]', '1000');
    url.searchParams.set('page[number]', String(number));
    const response = await fetchImpl(url, { signal: signal ?? AbortSignal.timeout(30000), headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Treasury API returned HTTP ${response.status}.`);
    const payload = await response.json();
    const count = payload.meta?.['total-count'];
    const pages = payload.meta?.['total-pages'];
    if (!Array.isArray(payload.data) || !Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(pages) || pages < 0 || pages > 100) throw new Error('Invalid Treasury pagination metadata.');
    if (count === 0) throw new Error(`No official value file is available for ${period}.`);
    if (pages < 1 || Math.ceil(count / 1000) !== pages) throw new Error('Inconsistent Treasury page count.');
    if (number === 1) { totalCount = count; totalPages = pages; }
    if (count !== totalCount || pages !== totalPages) throw new Error('Treasury data changed during pagination. Retry the request.');
    const expectedLength = number < pages ? 1000 : count - 1000 * (pages - 1);
    if (payload.data.length !== expectedLength) throw new Error('Incomplete Treasury page.');
    if (payload.data.some(row => row.redemp_period !== period)) throw new Error('Treasury returned an unexpected redemption period.');
    rows.push(...payload.data);
    if (number === pages) break;
  }
  const [normalized] = normalizeRows(rows);
  return { ...normalized, sourceUrl: SOURCE_URL, datasetUrl: DATASET_URL, retrievedAt: new Date().toISOString(), rowCount: rows.length };
}
