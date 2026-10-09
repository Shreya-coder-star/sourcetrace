const res = await fetch(
  'https://api.openaq.org/v3/locations?coordinates=28.6139,77.2090&radius=25000&limit=100',
  { headers: { 'X-API-Key': process.env.OPENAQ_API_KEY } }
);
console.log('Status:', res.status);
if (!res.ok) throw new Error(await res.text());

const { results } = await res.json();
console.log('Stations returned:', results.length);

// Show the raw date field of the first station so we know its shape
console.log('Raw datetimeLast example:', JSON.stringify(results[0]?.datetimeLast));

for (const loc of results) {
  const hasPm25 = (loc.sensors ?? []).some((s) => s.parameter?.name === 'pm25');
  const last = loc.datetimeLast?.utc ?? loc.datetimeLast ?? 'unknown';
  console.log(loc.id, '|', loc.name, '| pm25:', hasPm25, '| last:', last);
}