import * as turf from '@turf/turf';

// windFromDeg = the direction the wind blows FROM (315 = north-west).
// Polluted air reached the station from that side, so the suspect zone
// is a wedge pointing toward windFromDeg.
export function upwindWedge(
  station,
  windFromDeg,
  { radiusKm = 25, halfAngleDeg = 30, steps = 12 } = {}
) {
  const origin = turf.point([station.lon, station.lat]);
  const startBearing = windFromDeg - halfAngleDeg;

  const ring = [[station.lon, station.lat]];
  for (let i = 0; i <= steps; i++) {
    const bearing = startBearing + (2 * halfAngleDeg * i) / steps;
    const p = turf.destination(origin, radiusKm, bearing, { units: 'kilometers' });
    ring.push(p.geometry.coordinates);
  }
  ring.push([station.lon, station.lat]); // close the shape

  return turf.polygon([ring]);
}