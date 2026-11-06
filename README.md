# savings-bond-value-files

Read the U.S. Treasury's **Savings Bonds Value Files** (`sb_value`) as integer-cent JSON or CSV. A dependency-free ESM library and Node.js CLI for data pipelines, archival comparisons and spreadsheet imports.

The [Savings Bond Calculator](https://savingsbondcalculator.org/) provides the browser interface for individual bonds and saved lists. This package handles the underlying public data format; it does not include that website's calculation engine.

## Install

Requires Node.js 22.12 or newer.

```sh
npm install savings-bond-value-files
```

Before registry publication, or for an audited source checkout:

```sh
git clone https://github.com/jiankn/savings-bond-value-files.git
cd savings-bond-value-files
npm test
node bin/cli.mjs --help
```

## Read an official period

```js
import { fetchValuePeriod, lookupUnitValue } from 'savings-bond-value-files';

const table = await fetchValuePeriod('2023-05');
const cents = lookupUnitValue(table, 'I', '2002-03');
console.log(cents); // 6400: $64.00 per $25 face value in this official file
console.log(table.sourceUrl, table.retrievedAt);
```

## Command line

The executable belongs to the `savings-bond-value-files` package. Without a global installation, use:

```sh
npx --package savings-bond-value-files savings-bond-values --help
npx --package savings-bond-value-files savings-bond-values --period 2023-05 > values.json
npx --package savings-bond-value-files savings-bond-values --period 2023-05 --format csv > values.csv
```

For an API response already saved to disk (no network request):

```sh
node bin/cli.mjs --input tests/fixtures/treasury-2023-05.json --format csv
```

`--input` accepts an array of API rows or an object with a `data` array. It deliberately accepts partial extracts; it does not certify full series/year coverage. `fetchValuePeriod()` checks pagination, row counts, duplicate keys and period consistency, and rejects unavailable months.

## Data contract

| Treasury field/value | Normalized representation |
|---|---|
| `redemp_period` | `period`, formatted `YYYY-MM` |
| `series_cd`: `E`, `N`, `I`, `S` | `E`, `EE`, `I`, `SN` |
| `issue_year` + `issue_jan_amt` ... `issue_dec_amt` | 12 entries under `series[series][year]`, January first |
| Decimal amount string | Exact integer cents using decimal-string parsing |
| JSON `null` or string `"null"` | `null`, preserved separately from zero |
| `"0.00"` | Integer `0`, never converted to a missing value |

Each period includes `units: "cents"` and `denominationCents: 2500`. CSV emits one row per issue month. Missing amounts use an empty cell, zero uses `0`, and amounts use cents rather than dollar-formatted strings.

`lookupUnitValue()` returns a $25-unit value or `null` when absent. A returned zero is the raw file value; it is not a full accounting-value calculation. This package does not calculate interest, taxes, penalties, electronic-bond scaling, accrued value or personal redemption advice. For the complete calculation workflow and limitations, see the [calculation methodology](https://savingsbondcalculator.org/methodology/).

## API

- `amountToCents(value)` — convert an official decimal string or null; reject invalid formats and unsafe integers.
- `normalizeRows(rows)` — return periods sorted by month; reject duplicate period/series/year rows.
- `fetchValuePeriod('YYYY-MM', { signal, fetchImpl }?)` — retrieve one official redemption period with provenance. A fetch implementation may be injected for tests.
- `lookupUnitValue(period, series, 'YYYY-MM')` — look up the base-unit amount, preserving zero.
- `toCsv(periods)` — export normalized periods, including null cells.

## Sources and verification

- [Treasury dataset and field definitions](https://fiscaldata.treasury.gov/datasets/savings-bond-value-files/)
- [Treasury API documentation](https://fiscaldata.treasury.gov/api-documentation/)
- [Official API](https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/sb_value)

The test fixture is a recorded official API response, with its URL, retrieval timestamp and SHA-256 in `tests/fixtures/source.json`. Tests compare the known historical cell above and every fixture amount without floating-point conversion. Parser edge-case inputs are synthetic format tests, not financial examples. The package bundles no current interest rates or predictions.

Not affiliated with the U.S. Department of the Treasury or TreasuryDirect. For information only — confirm the value with TreasuryDirect before cashing a bond. Not financial or tax advice.

## Development

```sh
npm run check
npm test
npm pack
```

MIT license for the software. Treasury data retains its original source attribution.
