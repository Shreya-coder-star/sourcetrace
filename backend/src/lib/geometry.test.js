import test from 'node:test';
import assert from 'node:assert';
import * as turf from '@turf/turf';
import { upwindWedge } from './geometry.js';

const station = { lat: 28.647, lon: 77.316 }; // approximate, for testing
const origin = turf.point([station.lon, station.lat]);

test('north-west point is inside the zone when wind is from the north-west', () => {
  const zone = upwindWedge(station, 315);
  const nw = turf.destination(origin, 10, 315, { units: 'kilometers' });
  assert.equal(turf.booleanPointInPolygon(nw, zone), true);
});

test('south-east point is outside the zone when wind is from the north-west', () => {
  const zone = upwindWedge(station, 315);
  const se = turf.destination(origin, 10, 135, { units: 'kilometers' });
  assert.equal(turf.booleanPointInPolygon(se, zone), false);
});