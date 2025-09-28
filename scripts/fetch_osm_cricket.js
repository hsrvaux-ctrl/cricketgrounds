/**
 * Minimal Overpass fetcher to pull cricket pitches in the UK and convert to grounds.json
 * Use carefully and avoid running too often.
 * Node 18 or newer. No deps.
 */
import fs from 'node:fs';
import https from 'node:https';

const query = `
[out:json][timeout:90];
area["ISO3166-1"="GB"][admin_level=2]->.uk;
(
  node["leisure"="pitch"]["sport"="cricket"](area.uk);
  way["leisure"="pitch"]["sport"="cricket"](area.uk);
  relation["leisure"="pitch"]["sport"="cricket"](area.uk);
);
out center tags;
`;

function overpassFetch(q) {
  const body = 'data=' + encodeURIComponent(q);
  const options = {
    method: 'POST',
    hostname: 'overpass-api.de',
    path: '/api/interpreter',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve(JSON.parse(buf)));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function normalise(osm) {
  return osm.elements.map((el, i) => {
    const id = `${el.type}/${el.id}`;
    const name = el.tags?.name || 'Cricket ground';
    const county = el.tags?.['addr:county'] || '';
    const address = [el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']].filter(Boolean).join(', ');
    const lat = el.lat || el.center?.lat;
    const lon = el.lon || el.center?.lon;
    return {
      id,
      name,
      club: '',
      county,
      address,
      lat,
      lon,
      pitch_type: 'Natural grass',
      strips: '',
      nets: '',
      bar: '',
      parking: '',
      notes: '',
      club_url: '',
      play_cricket_url: '',
      booking_url: '',
      what3words: '',
      description: ''
    };
  }).filter(g => typeof g.lat === 'number' && typeof g.lon === 'number');
}

const osm = await overpassFetch(query);
const grounds = normalise(osm);
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/grounds.json', JSON.stringify(grounds, null, 2));
console.log('Wrote', grounds.length, 'grounds to data/grounds.json');
