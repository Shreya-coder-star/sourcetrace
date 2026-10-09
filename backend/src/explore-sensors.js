const res = await fetch('https://api.openaq.org/v3/locations/13', {
  headers: { 'X-API-Key': process.env.OPENAQ_API_KEY },
});
if (!res.ok) throw new Error(`OpenAQ error ${res.status}`);
const loc = (await res.json()).results[0];

console.log('Station:', loc.name);
for (const s of loc.sensors ?? []) {
  console.log(' sensor', s.id, '-', s.parameter?.name, `(${s.parameter?.units})`);
}