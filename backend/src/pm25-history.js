const LOCATION_ID = process.argv[2] ?? '5626';
const headers = { 'X-API-Key': process.env.OPENAQ_API_KEY };

const locRes = await fetch(`https://api.openaq.org/v3/locations/${LOCATION_ID}`, { headers });
if (!locRes.ok) throw new Error(`Location error ${locRes.status}`);
const loc = (await locRes.json()).results[0];
const sensor = (loc.sensors ?? []).find((s) => s.parameter?.name === 'pm25');
if (!sensor) throw new Error('No PM2.5 sensor at this location');

const lastUtc = loc.datetimeLast?.utc;
console.log('Station:', loc.name, '| coords:', JSON.stringify(loc.coordinates));
console.log('PM2.5 sensor:', sensor.id, '| last reading:', lastUtc);

// look at the 7 days ending at the station's last reading
const end = lastUtc ? new Date(lastUtc) : new Date();
const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
const url =
  `https://api.openaq.org/v3/sensors/${sensor.id}/hours` +
  `?datetime_from=${start.toISOString()}&datetime_to=${end.toISOString()}&limit=200`;

const res = await fetch(url, { headers });
console.log('Status:', res.status);
if (!res.ok) throw new Error(await res.text());
const { results } = await res.json();
console.log('Hours returned:', results.length);
if (results.length === 0) process.exit(0);

console.log('Raw record:', JSON.stringify(results[0]));
const peak = results.reduce((a, b) => (b.value > a.value ? b : a));
console.log('Peak:', peak.value, 'at', peak.period?.datetimeFrom?.local);
for (const r of results.slice(0, 12)) {
  console.log(r.period?.datetimeFrom?.local ?? '?', '->', r.value);
}