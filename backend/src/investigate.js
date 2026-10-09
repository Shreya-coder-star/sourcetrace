import { writeFileSync } from 'node:fs';
import * as turf from '@turf/turf';
import { upwindWedge } from './lib/geometry.js';

const LOCATION_ID = process.argv[2] ?? '5626';
const headers = { 'X-API-Key': process.env.OPENAQ_API_KEY };

// 1. Station and its PM2.5 sensor
const locRes = await fetch(`https://api.openaq.org/v3/locations/${LOCATION_ID}`, { headers });
if (!locRes.ok) throw new Error(`Location error ${locRes.status}`);
const loc = (await locRes.json()).results[0];
const sensor = loc.sensors.find((s) => s.parameter?.name === 'pm25');
const station = {
  name: loc.name,
  lat: loc.coordinates.latitude,
  lon: loc.coordinates.longitude,
};

// 2. Seven days of hourly PM2.5, ending at the station's last reading
const end = new Date(loc.datetimeLast.utc);
const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
const pmRes = await fetch(
  `https://api.openaq.org/v3/sensors/${sensor.id}/hours` +
    `?datetime_from=${start.toISOString()}&datetime_to=${end.toISOString()}&limit=200`,
  { headers }
);
if (!pmRes.ok) throw new Error(`PM2.5 error ${pmRes.status}`);
const hours = (await pmRes.json()).results
  .map((r) => ({ local: r.period.datetimeFrom.local, value: r.value }))
  .sort((a, b) => a.local.localeCompare(b.local));

// 3. The spike: highest hour, compared with the median of the 24 hours before it
const pi = hours.reduce((best, h, i) => (h.value > hours[best].value ? i : best), 0);
const before = hours.slice(Math.max(0, pi - 24), pi).map((h) => h.value).sort((a, b) => a - b);
const baseline = before.length ? before[Math.floor(before.length / 2)] : null;
console.log(`Station: ${station.name} (${station.lat}, ${station.lon})`);
console.log(`Spike: ${hours[pi].value} at ${hours[pi].local} | baseline (24h median): ${baseline}`);
console.log('PM2.5 around the spike:');
for (const h of hours.slice(Math.max(0, pi - 6), pi + 3)) console.log('  ', h.local, '->', h.value);

// 4. Wind for the 4 hours up to the spike (Open-Meteo, modelled wind)
const wRes = await fetch(
  'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${station.lat}&longitude=${station.lon}` +
    '&hourly=wind_direction_10m,wind_speed_10m&past_days=10&forecast_days=1&timezone=Asia%2FKolkata'
);
if (!wRes.ok) throw new Error(`Open-Meteo error ${wRes.status}`);
const w = (await wRes.json()).hourly;
const wi = w.time.indexOf(hours[pi].local.slice(0, 16));
if (wi < 3) throw new Error('Spike hour not found in wind data');

// Average the wind as vectors, so 350 and 10 degrees average to 0, not 180
const rad = (d) => (d * Math.PI) / 180;
let sx = 0, sy = 0, sp = 0;
for (let i = wi - 3; i <= wi; i++) {
  const spd = w.wind_speed_10m[i];
  sx += spd * Math.sin(rad(w.wind_direction_10m[i]));
  sy += spd * Math.cos(rad(w.wind_direction_10m[i]));
  sp += spd;
}
const meanDir = ((Math.atan2(sx, sy) * 180) / Math.PI + 360) % 360;
const meanSpeed = sp / 4;
const consistency = sp > 0 ? Math.hypot(sx, sy) / sp : 0; // 1 = steady, 0 = all over the place
const confidence =
  meanSpeed < 5 || consistency < 0.6 ? 'low' : consistency < 0.85 ? 'medium' : 'high';
console.log(
  `Wind FROM ${meanDir.toFixed(0)} degrees at ${meanSpeed.toFixed(1)} km/h | steadiness ${consistency.toFixed(2)} | confidence: ${confidence}`
);

// 5. Wedge for that wind, saved for geojson.io
const wedge = upwindWedge(station, meanDir);
wedge.properties = { spike: hours[pi].value, windFromDeg: Math.round(meanDir), confidence };
writeFileSync(
  'wedge.geojson',
  JSON.stringify(turf.featureCollection([turf.point([station.lon, station.lat], { name: station.name }), wedge]), null, 2)
);
console.log('Wrote wedge.geojson');