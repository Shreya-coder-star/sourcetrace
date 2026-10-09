import { writeFileSync } from 'node:fs';
import * as turf from '@turf/turf';
import { upwindWedge } from './lib/geometry.js';

// 1. Station coordinates from OpenAQ (location 13 = DTU, Delhi)
const locRes = await fetch('https://api.openaq.org/v3/locations/13', {
  headers: { 'X-API-Key': process.env.OPENAQ_API_KEY },
});
if (!locRes.ok) throw new Error(`OpenAQ error ${locRes.status}`);
const loc = (await locRes.json()).results[0];
const station = {
  name: loc.name,
  lat: loc.coordinates.latitude,
  lon: loc.coordinates.longitude,
};
console.log('Station:', station);

// 2. Wind for the last day, from Open-Meteo
const url =
  'https://api.open-meteo.com/v1/forecast' +
  `?latitude=${station.lat}&longitude=${station.lon}` +
  '&hourly=wind_direction_10m,wind_speed_10m' +
  '&past_days=1&forecast_days=1&timezone=Asia%2FKolkata';
const wRes = await fetch(url);
if (!wRes.ok) throw new Error(`Open-Meteo error ${wRes.status}`);
const hourly = (await wRes.json()).hourly;

// 3. Use the most recent hour that is not in the future
let i = hourly.time.length - 1;
while (i > 0 && new Date(hourly.time[i]) > new Date()) i--;
const fromDeg = hourly.wind_direction_10m[i];
console.log(
  `At ${hourly.time[i]}: wind FROM ${fromDeg} degrees at ${hourly.wind_speed_10m[i]} km/h`
);

// 4. Build the wedge and save it
const fc = turf.featureCollection([
  turf.point([station.lon, station.lat], { name: station.name }),
  upwindWedge(station, fromDeg),
]);
writeFileSync('wedge.geojson', JSON.stringify(fc, null, 2));
console.log('Wrote wedge.geojson');