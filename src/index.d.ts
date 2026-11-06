export type Series = 'E' | 'EE' | 'I' | 'SN';
export interface ValuePeriod {
  period: string;
  units: 'cents';
  denominationCents: 2500;
  series: Record<Series, Record<string, (number | null)[]>>;
}
export interface FetchedValuePeriod extends ValuePeriod {
  sourceUrl: string;
  datasetUrl: string;
  retrievedAt: string;
  rowCount: number;
}
export const SOURCE_URL: string;
export const DATASET_URL: string;
export function amountToCents(value: string | null): number | null;
export function normalizeRows(rows: Record<string, unknown>[]): ValuePeriod[];
export function lookupUnitValue(period: ValuePeriod, series: Series, issue: string): number | null;
export function toCsv(periods: ValuePeriod[]): string;
export function fetchValuePeriod(period: string, options?: { fetchImpl?: typeof fetch; signal?: AbortSignal }): Promise<FetchedValuePeriod>;
