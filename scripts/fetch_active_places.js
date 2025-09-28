// scripts/fetch_active_places.js
// Fetch Active Places (England) via ArcGIS GeoServices or WFS without API keys.
// You must provide a FEATURE LAYER URL via env ACTIVE_PLACES_URL that supports
// either query?where=1=1&outFields=*&f=geojson (ArcGIS) or a WFS GetFeature URL.
// Output: tmp/england_active_places.geojson
//
// Example ArcGIS GeoServices (typical):
//   ACTIVE_PLACES_URL="https://services1.arcgis.com/xxx/arcgis/rest/services/Active_Places_Sites/FeatureServer/0"
//
// We normalize to a minimal schema for merge_sources.js:
// {
//   id, name, address, postcode, website, county, lat, lon,
//   facility_type, management_type, source: 'active_places'
// }

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'tmp', 'england_active_places.geojson');
const URL = process.env.ACTIVE_PLACES_URL || '';

async function fetchJSON(u){
  const r = await fetch(u);
  if(!r.ok) throw new Error('HTTP '+r.status+' '+u);
  return r.json();
}

async function ensureTmp(){ await fs.mkdir(path.join(process.cwd(),'tmp'), {recursive:true}); }

function mapArcgisFeature(f){
  const a = f.properties || f.attributes || {};
  const g = f.geometry || {};
  const lat = g.y ?? g.latitude ?? (Array.isArray(f.coordinates)? f.coordinates[1] : null);
  const lon = g.x ?? g.longitude ?? (Array.isArray(f.coordinates)? f.coordinates[0] : null);
  // common field guesses
  const name = a.SiteName || a.FacilityName || a.Name || a.SITE_NAME || a.FACILITY_NAME || a.name;
  const postcode = a.Postcode || a.POSTCODE || a.Post_Code || a.PostCode;
  const address = a.Address || a.ADDRESS || a.Address1 || [a.Address1,a.Address2,a.Town].filter(Boolean).join(', ');
  const website = a.Website || a.WEBSITE || a.URL || a.SiteUrl;
  const county = a.County || a.COUNTY || a.AdministrativeArea;
  const facility_type = a.FacilityType || a.FACILITY_TYPE || a.Sport || a.PrimaryUse;
  const management_type = a.ManagementType || a.MANAGEMENT_TYPE || a.Ownership || a.SiteOwnerType;

  return {
    id: String(a.OBJECTID || a.GlobalID || a.SiteID || a.SITE_ID || name+'_'+postcode || Math.random().toString(36).slice(2)),
    name: name || 'Cricket ground',
    address: address || '',
    postcode: postcode || '',
    website: website || '',
    county: county || '',
    lat: lat ? Number(lat) : null,
    lon: lon ? Number(lon) : null,
    facility_type: facility_type || '',
    management_type: management_type || '',
    source: 'active_places'
  };
}

async function main(){
  if(!URL){ console.log('ACTIVE_PLACES_URL not set; skipping'); return; }
  await ensureTmp();

  let geojson;
  if(URL.includes('/FeatureServer/') || URL.includes('/MapServer/')){
    // ArcGIS GeoServices query endpoint -> GeoJSON
    const q = `${URL.replace(/\/$/, '')}/query?where=1%3D1&outFields=*&f=geojson`;
    geojson = await fetchJSON(q);
  } else if (URL.toLowerCase().includes('service=wfs') || URL.toLowerCase().includes('ows?')){
    // WFS - assume GeoJSON output
    const u = URL.includes('outputFormat=')
      ? URL
      : URL + (URL.includes('?') ? '&' : '?') + 'service=WFS&request=GetFeature&outputFormat=application/json';
    geojson = await fetchJSON(u);
  } else {
    throw new Error('Unsupported Active Places URL. Provide a FeatureServer layer or WFS GetFeature endpoint.');
  }

  const features = (geojson.features || []).map(mapArcgisFeature).filter(x => /cricket/i.test([x.name, x.facility_type].join(' ')));
  const out = { type:'FeatureCollection', features: features.map(x => ({ type:'Feature', properties:x, geometry: { type:'Point', coordinates: [x.lon, x.lat] } })) };
  await fs.writeFile(OUT, JSON.stringify(out, null, 2));
  console.log('Saved', OUT, 'features:', out.features.length);
}
main().catch(e=>{ console.error(e); process.exit(1); });
