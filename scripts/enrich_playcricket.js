// scripts/enrich_playcricket.js
// Enriches data/grounds.json with Play-Cricket club info if you have an API token
// Usage: PLAY_CRICKET_TOKEN=xxxx node scripts/enrich_playcricket.js
// Optional: COUNTY_FILTER="Greater London,Lancashire" (narrows matching heuristics)

import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_PATH = path.join(process.cwd(), 'data', 'grounds.json');
const TOKEN = process.env.PLAY_CRICKET_TOKEN || '';
const COUNTY_FILTER = (process.env.COUNTY_FILTER || '').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
const PC_BASE = 'https://www.play-cricket.com/api/v2';

function norm(s){ return (s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); }
function similarity(a,b){
  const A = new Set(norm(a).split(' ').filter(Boolean));
  const B = new Set(norm(b).split(' ').filter(Boolean));
  if(!A.size||!B.size) return 0;
  let inter=0; A.forEach(x=>{ if(B.has(x)) inter++; });
  return inter/(A.size+B.size-inter);
}
async function fetchJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(url+': '+r.status); return r.json(); }

async function fetchAllClubs(){
  const clubs=[];
  for(let cid=1; cid<=100; cid++){
    try{
      const url = `${PC_BASE}/clubs.json?api_token=${TOKEN}&county_id=${cid}`;
      const j = await fetchJSON(url);
      if(Array.isArray(j?.clubs)){
        j.clubs.forEach(c=>clubs.push({ id:c.id, name:c.name, county_id:c.county_id }));
      }
    }catch{}
    await new Promise(r=>setTimeout(r,300));
  }
  // de-dup
  const m=new Map(); clubs.forEach(c=>m.set(String(c.id), c));
  return [...m.values()];
}
async function fetchClubDetail(id){
  const url = `${PC_BASE}/clubs/${id}.json?api_token=${TOKEN}`;
  const j = await fetchJSON(url);
  const c=j?.club||{};
  return { id:c.id, name:c.name, website:c.website_url||null, leagues:(c.leagues||[]).map(x=>x.name).filter(Boolean) };
}

async function main(){
  if(!TOKEN){ console.log('No PLAY_CRICKET_TOKEN, skipping'); return; }
  const raw = await fs.readFile(DATA_PATH, 'utf8').catch(()=>null);
  if(!raw){ console.log('No data/grounds.json found'); return; }
  let grounds = []; try{ grounds = JSON.parse(raw) }catch{ console.log('Invalid grounds.json'); return; }

  console.log('Fetching Play-Cricket clubs…');
  const clubs = await fetchAllClubs();
  console.log('Clubs fetched:', clubs.length);

  const THRESH = 0.65;
  for(const g of grounds){
    // County pre-filter (soft): if COUNTY_FILTER set, require ground.county includes one
    if(COUNTY_FILTER.length){
      const gc = norm(g.county);
      if(!COUNTY_FILTER.some(cf => gc.includes(cf))) continue;
    }
    const basis = g.club || g.name || '';
    let best=null;
    for(const c of clubs){
      const sim = similarity(basis, c.name);
      if(sim>=THRESH && (!best || sim>best.sim)) best={...c, sim};
    }
    if(best){
      let det={}; try{ det=await fetchClubDetail(best.id) }catch{}
      g.club_official_name = det.name || best.name;
      g.play_cricket_club_id = String(best.id);
      g.play_cricket_url = det.website || `https://play-cricket.com/Club/${best.id}`;
      g.league_names = det.leagues || [];
      g.verified = true;
    }
  }
  await fs.writeFile(DATA_PATH, JSON.stringify(grounds, null, 2));
  console.log('Enrichment complete.');
}
main().catch(e=>{ console.error(e); process.exit(1); });
