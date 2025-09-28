// scripts/merge_sources.js
// Merge keyless sources into data/grounds.json:
// - tmp/england_active_places.geojson
// - tmp/scotland_sports.geojson
// - existing data/grounds.json as fallback (e.g., OSM-based)
// Deduplicates by proximity + name similarity.
// Preserves ratings by reusing existing 'id' when close match is found.

import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'data', 'grounds.json');

function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); }
function sim(a,b){
  const A=new Set(norm(a).split(' ').filter(Boolean)), B=new Set(norm(b).split(' ').filter(Boolean));
  if(!A.size||!B.size) return 0;
  let inter=0; A.forEach(x=>{ if(B.has(x)) inter++;});
  return inter/(A.size+B.size-inter);
}
function dist(a,b){
  const toRad = d=>d*Math.PI/180;
  const R=6371000;
  const dLat = toRad((b.lat||0)-(a.lat||0));
  const dLon = toRad((b.lon||0)-(a.lon||0));
  const la1 = toRad(a.lat||0), la2 = toRad(b.lat||0);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
function toRow(p){
  return {
    id: p.id,
    name: p.name || 'Cricket ground',
    club: p.club || p.name || '',
    county: p.county || '',
    address: p.address || '',
    lat: Number(p.lat), lon: Number(p.lon),
    pitch_type: p.pitch_type || 'Natural grass',
    strips: p.strips || null,
    nets: !!p.nets, bar: !!p.bar, parking: !!p.parking,
    description: p.description || '',
    image_url: p.image_url || '',
    image_credit: p.image_credit || '',
    image_license: p.image_license || '',
    club_url: p.club_url || '',
    play_cricket_url: p.play_cricket_url || '',
    booking_url: p.booking_url || '',
    verified: p.source === 'active_places' || p.source === 'scotland_open',
    source: p.source || 'unknown'
  };
}

async function readGeojson(p){
  try{ const j=JSON.parse(await fs.readFile(p,'utf8')); return (j.features||[]).map(f=>f.properties||{}); }
  catch{ return []; }
}
async function readExisting(){
  try{ return JSON.parse(await fs.readFile(OUT, 'utf8')); } catch{ return []; }
}

async function main(){
  const existing = await readExisting();
  const active = await readGeojson('tmp/england_active_places.geojson');
  const scot   = await readGeojson('tmp/scotland_sports.geojson');
  const rows = [];

  // Seed with existing so IDs persist
  existing.forEach(e=>rows.push(e));

  function upsert(p){
    if(!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return;
    const cand = rows
      .map((r,idx)=>({r, idx, d: dist({lat:+r.lat,lon:+r.lon},{lat:+p.lat,lon:+p.lon}), s: sim(r.name, p.name)||sim(r.club||'', p.name)}))
      .sort((a,b)=> (a.d-b.d) || (b.s-a.s));

    const best = cand.length? cand[0]: null;
    if(best && (best.d < 700) && (best.s > 0.35)){
      // merge into existing row
      const r = rows[best.idx];
      r.name = p.name || r.name;
      r.club = p.club || r.club;
      r.address = p.address || r.address;
      r.county = p.county || r.county;
      r.play_cricket_url = p.play_cricket_url || r.play_cricket_url;
      r.website = p.website || r.website;
      r.verified = r.verified || (p.source === 'active_places' || p.source === 'scotland_open');
      r.source = r.source || p.source;
      if (!r.image_url && p.image_url) r.image_url = p.image_url;
    } else {
      rows.push(toRow(p));
    }
  }

  active.forEach(upsert);
  scot.forEach(upsert);

  await fs.mkdir('data', {recursive:true});
  await fs.writeFile(OUT, JSON.stringify(rows, null, 2));
  console.log('Merged rows:', rows.length);
}
main().catch(e=>{ console.error(e); process.exit(1); });
