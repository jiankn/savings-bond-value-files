import { fetchValuePeriod, lookupUnitValue } from 'savings-bond-value-files';

const period = await fetchValuePeriod('2023-05');
console.log({ period: period.period, unitValueCents: lookupUnitValue(period, 'I', '2002-03'), sourceUrl: period.sourceUrl });
