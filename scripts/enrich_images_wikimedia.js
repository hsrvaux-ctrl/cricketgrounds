/**
 * Enrich grounds.json with one image per ground via Wikimedia where missing.
 * Priority: existing image_url -> keep. If not:
 * 1) If 'wikipedia' tag exists: fetch REST summary and use thumbnail.
 * 2) Else search Wikimedia Commons for "<name> cricket ground <county>" and take first result with image.
 * Also fill image_credit and image_license when possible.
 * 
 * Run: node scripts/enrich_images_wikimedia.js
 */
import fs from 'node:fs/promises';

const WIKI_TIMEOUT = 120;
const SLEEP_MS = 1000; // be polite

function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'cricket-map-bot/1.0 (contact: your-email@example.com)'} });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.json();
}

function parseWikipediaTag(tag) {
  // format like "en:Lord's_Cricket_Ground"
  if (!tag) return null;
  const [lang, ...rest] = tag.split(':');
  const title = rest.join(':');
  return { lang, title };
}

async function getSummaryThumb(lang, title) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const json = await fetchJson(url);
  const thumb = json.thumbnail?.source || '';
  const credit = json.titles?.display ? `Image via Wikipedia (${json.titles.display})` : 'Image via Wikipedia';
  return { image_url: thumb, image_credit: credit, image_license: 'Likely CC BY-SA; see source page' };
}

async function commonsSearch(query) {
  // Search Commons pages
  const url = `https://commons.wikimedia.org/w/api.php?action=query&origin=*&format=json&prop=imageinfo&iiprop=url|extmetadata&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1`;
  const json = await fetchJson(url);
  const pages = json.query?.pages || {};
  const first = Object.values(pages)[0];
  if (!first) return null;
  const info = first.imageinfo?.[0];
  if (!info) return null;
  const urlImg = info.url;
  const meta = info.extmetadata || {};
  const artist = meta.Artist?.value || '';
  const license = meta.LicenseShortName?.value || '';
  const credit = artist ? `© ${artist} (Wikimedia Commons)` : 'Wikimedia Commons';
  return { image_url: urlImg, image_credit: credit, image_license: license || 'See Commons page' };
}

async function main() {
  const text = await fs.readFile('data/grounds.json','utf8');
  let rows = JSON.parse(text);

  let updated = 0;
  for (const g of rows) {
    if (g.image_url) continue; // already has one (from OSM)
    let enriched = null;

    if (g.wikipedia) {
      try {
        const { lang, title } = parseWikipediaTag(g.wikipedia) || {};
        if (lang && title) {
          enriched = await getSummaryThumb(lang, title);
        }
      } catch {}
    }
    if (!enriched) {
      const q = `${g.name} cricket ground ${g.county || ''}`.trim();
      try {
        enriched = await commonsSearch(q);
      } catch {}
    }
    if (enriched && enriched.image_url) {
      g.image_url = enriched.image_url;
      g.image_credit = enriched.image_credit || g.image_credit || '';
      g.image_license = enriched.image_license || g.image_license || '';
      updated++;
      await sleep(SLEEP_MS);
    }
  }

  await fs.writeFile('data/grounds.json', JSON.stringify(rows, null, 2));
  console.log(`Image enrichment complete. Updated ${updated} grounds.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
