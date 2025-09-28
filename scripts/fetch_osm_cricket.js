/**
 * Fetch cricket grounds across the UK from OpenStreetMap via Overpass API
 * and write to data/grounds.json in the repo.
 * 
 * Run with: node scripts/fetch_osm_cricket.js
 * Requires Node 18+ (global fetch available).
 */
import fs from 'node:fs/promises';

const OVERPASS_ENDPOINT = process.env.OVERPASS_ENDPOINT || 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'cricket-map-bot/1.0 (contact: your-email@example.com)';

const query = `
[out:json][timeout:180];
area["ISO3166-1"="GB"][admin_level=2]->.uk;
(
  node["leisure"="pitch"]["sport"="cricket"](area.uk);
  way["leisure"="pitch"]["sport"="cricket"](area.uk);
  relation["leisure"="pitch"]["sport"="cricket"](area.uk);
);
out center tags;
`;

async function overpassFetch(q) {
  const res = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT
    },
    body: 'data=' + encodeURIComponent(q)
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`Overpass error ${res.status}: ${t.slice(0,200)}`);
  }
  return res.json();
}

function tag(o, key) { return o.tags && o.tags[key] || ''; }

function normalise(osm) {
  return osm.elements.map((el) => {
    const id = `${el.type}/${el.id}`;
    const name = tag(el, 'name') || 'Cricket ground';
    const county = tag(el, 'addr:county') || tag(el, 'is_in:county') || '';
    const address = [tag(el,'addr:housenumber'), tag(el,'addr:street'), tag(el,'addr:city')].filter(Boolean).join(', ');
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;

    const wikidata = tag(el, 'wikidata'); // e.g. Q12345
    const wikipedia = tag(el, 'wikipedia'); // e.g. en:Lord%27s_Cricket_Ground
    const imageTag = tag(el, 'image'); // direct URL if present
    const commonsTag = tag(el, 'wikimedia_commons'); // e.g. File:Something.jpg

    return {
      id,
      source: 'osm',
      name,
      club: tag(el,'operator') || '',
      county,
      address,
      lat, lon,
      pitch_type: tag(el, 'surface') || 'Natural grass',
      strips: '',
      nets: '',
      bar: '',
      parking: '',
      notes: '',
      club_url: tag(el, 'website') || '',
      play_cricket_url: '',
      booking_url: '',
      what3words: '',
      description: '',
      // Image enrichment placeholders:
      image_url: imageTag || (commonsTag ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commonsTag.replace(/^File:/i,''))}` : ''),
      image_credit: '',
      image_license: '',
      wikidata,
      wikipedia
    };
  }).filter(g => Number.isFinite(g.lat) && Number.isFinite(g.lon));
}

async function main() {
  console.log('Fetching OSM cricket pitches for UK…');
  const json = await overpassFetch(query);
  const grounds = normalise(json);
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile('data/grounds.json', JSON.stringify(grounds, null, 2));
  console.log(`Wrote ${grounds.length} grounds to data/grounds.json`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
