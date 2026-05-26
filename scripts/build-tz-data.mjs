// Build-time: simplify timezone polygons further if needed,
// compute a representative longitude per zone (centroid of largest ring),
// strip noise from properties, and emit to public/data/.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import centroid from '@turf/centroid';
import { feature as turfFeature, featureCollection } from '@turf/helpers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../data-src/tz-simplified.geojson');
const OUT = resolve(__dirname, '../public/data/timezones.geojson');
const OUT_META = resolve(__dirname, '../public/data/zones.json');

if (!existsSync(SRC)) {
  console.error(`Missing source ${SRC}. See scripts/README.md`);
  process.exit(1);
}

const raw = JSON.parse(readFileSync(SRC, 'utf8'));
const zones = [];

const outFeatures = raw.features.map((f) => {
  const tzid = f.properties?.tzid;
  // centroid handles MultiPolygon by averaging vertex coords
  const c = centroid(f).geometry.coordinates;
  zones.push({ tzid, lon: c[0], lat: c[1] });
  return {
    type: 'Feature',
    properties: { tzid },
    geometry: f.geometry,
  };
});

writeFileSync(OUT, JSON.stringify(featureCollection(outFeatures)));
writeFileSync(OUT_META, JSON.stringify(zones));
console.log(`Wrote ${outFeatures.length} zones → ${OUT}`);
console.log(`Wrote zone metadata → ${OUT_META}`);
