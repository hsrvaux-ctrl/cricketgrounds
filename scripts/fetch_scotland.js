// scripts/fetch_scotland.js
// Fetch Scotland sports facilities (open) and filter to cricket-like names/types.
// Output: tmp/scotland_sports.geojson (normalized)

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'tmp', 'scotland_sports.geojson');
const SRC = process.env.SCOTLAND_FACILITIES_URL || 'https://opendata.arcgis.com/api/v3/datasets/f13873a2-e78c-4f2b-a1af-cfb8f9895330_8/downloads/data?format=geojson&spatialRefId=4326'; // example sublayer

async function fetchJSON(u){ const r=await fetch(u); if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); }
async function ensureTmp(){ await fs.mkdir(path.join(process.cwd(),'tmp'), {recursive:true}); }

function mapFeature(f){
  const a = f.properties || {};
  const g = f.geometry || {};
  const name = a.FacilityName || a.SiteName || a.Name || a.name || 'Cricket ground';
  const lat = (g.coordinates && g.coordinates[1]) ?? g.y ?? null;
  const lon = (g.coordinates && g.coordinates[0]) ?? g.x ?? null;
  const county = a.LocalAuthority || a.Council || a.AdminArea || '';
  const website = a.Web || a.Website || a.URL || '';
  return {
    id: String(a.OBJECTID || a.GlobalID || name+'_'+county),
    name,
    address: a.Address || a.Address1 || '',
    postcode: a.Postcode || a.POSTCODE || '',
    website,
    county,
    lat: lat?Number(lat):null, lon: lon?Number(lon):null,
    facility_type: a.Sport || a.FacilityType || '',
    management_type: a.Management || a.Owner || '',
    source: 'scotland_open'
  };
}

async function main(){
  await ensureTmp();
  const j = await fetchJSON(SRC);
  const feats = (j.features||[]).map(mapFeature).filter(x => /cricket/i.test([x.name, x.facility_type].join(' ')));
  const out = { type:'FeatureCollection', features: feats.map(x => ({ type:'Feature', properties:x, geometry:{ type:'Point', coordinates:[x.lon, x.lat] } })) };
  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log('Saved', OUT, 'features:', out.features.length);
}
main().catch(e=>{ console.error(e); process.exit(1); });
