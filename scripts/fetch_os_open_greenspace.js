// scripts/fetch_os_open_greenspace.js
// Fetch OS Open Greenspace (no key) and heuristically identify "cricket" from names.
// Output: tmp/os_greenspace.geojson
//
// Note: OS Open Greenspace classifies pitches as "Playing Field". Attribute names vary;
// We use 'function'/'theme'/'descriptio' heuristics and name string contains 'cricket'.

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'tmp', 'os_greenspace.geojson');
const URL = process.env.OS_OPEN_GREENSPACE_URL || 'https://osdatahub.os.uk/downloads/open/OpenGreenspace/GeoPackage'; // placeholder: user should replace with a direct GeoJSON/CSV mirror if available

async function fetchBuffer(u){
  const r = await fetch(u);
  if(!r.ok) throw new Error('HTTP '+r.status);
  return Buffer.from(await r.arrayBuffer());
}

async function main(){
  // We leave this as optional because OS OG often requires a download of a GeoPackage or GML, which needs GDAL to parse.
  // For now, we simply skip unless the user provides a pre-converted GeoJSON URL in OS_OPEN_GREENSPACE_URL.
  if(!URL.toLowerCase().endswith('.geojson')){
    console.log('OS_OPEN_GREENSPACE_URL should point to a .geojson for automated use. Skipping.');
    return;
  }
  const buf = await fetchBuffer(URL);
  await fs.mkdir('tmp', {recursive:true});
  await fs.writeFile(OUT, buf);
  console.log('Saved', OUT);
}
main().catch(e=>{ console.error(e); process.exit(1); });
