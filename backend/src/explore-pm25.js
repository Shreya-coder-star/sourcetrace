const from = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
const to = new Date().toISOString();

const url =
  'https://api.openaq.org/v3/sensors/13864/hours' +
  `?datetime_from=${from}&datetime_to=${to}&limit=100`;

const res = await fetch(url, {
  headers: { 'X-API-Key': process.env.OPENAQ_API_KEY },
});
console.log('Status:', res.status);
if (!res.ok) throw new Error(await res.text());

const { results } = await res.json();
console.log('Hours returned:', results.length);

// Show one raw record so we can see the exact shape
console.log(JSON.stringify(results[0], null, 2));

for (const r of results) {
  console.log(r.period?.datetimeFrom?.local ?? '?', '->', r.value);
}