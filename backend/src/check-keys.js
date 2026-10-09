// OpenAQ: monitoring stations within 25 km of central Delhi
const aq = await fetch(
  'https://api.openaq.org/v3/locations?coordinates=28.6139,77.2090&radius=25000&limit=5',
  { headers: { 'X-API-Key': process.env.OPENAQ_API_KEY } }
);
console.log('OpenAQ status:', aq.status);
const aqJson = await aq.json();
for (const loc of aqJson.results ?? []) {
  console.log(' -', loc.id, loc.name);
}

// FIRMS: fire hotspots in a Delhi-NCR box for the last day
const key = process.env.FIRMS_MAP_KEY;
const bbox = '76.5,27.8,78.2,29.2'; // west,south,east,north
const fr = await fetch(
  `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_SNPP_NRT/${bbox}/1`
);
console.log('FIRMS status:', fr.status);
const csv = await fr.text();
console.log('FIRMS rows (including header):', csv.trim().split('\n').length);