// /.netlify/functions/submit_rating
// Uses built-in fetch in Netlify's Node runtime (no node-fetch required).
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const body = JSON.parse(event.body || '{}');
    const required = ['ground_id','pitch','pavilion','bar','atmosphere','value'];
    for (const k of required) if (body[k] == null) return { statusCode: 400, body: 'Missing field: '+k };

    const token=process.env.GITHUB_TOKEN, repo=process.env.GITHUB_REPO, branch=process.env.GITHUB_BRANCH||'main';
    if(!token||!repo) return { statusCode: 500, body: 'Server not configured' };

    const path='data/ratings.json';
    const api='https://api.github.com';
    const headers={'Authorization':'Bearer '+token,'Accept':'application/vnd.github+json','User-Agent':'cricket-map-bot'};

    // 1) Fetch current file to obtain sha and content
    const getUrl=`${api}/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
    const curRes=await fetch(getUrl,{headers});
    if(!curRes.ok){ const t=await curRes.text().catch(()=> ''); return { statusCode: 502, body:'GitHub get failed: '+t.slice(0,200)}}
    const cur=await curRes.json();
    const sha=cur.sha;
    const content=Buffer.from(cur.content||'', cur.encoding||'base64').toString('utf8')||'[]';

    let arr=[]; try{ arr=JSON.parse(content) }catch{ arr=[] }
    const now=new Date().toISOString();
    const entry={ ground_id:String(body.ground_id), pitch:Number(body.pitch), pavilion:Number(body.pavilion), bar:Number(body.bar), atmosphere:Number(body.atmosphere), value:Number(body.value), name:(body.name||'').slice(0,80), comment:(body.comment||'').slice(0,300), created_at:now, ua:(event.headers['user-agent']||'').slice(0,120) };
    arr.push(entry);

    const newContent=Buffer.from(JSON.stringify(arr,null,2),'utf8').toString('base64');

    // 2) Commit new file content
    const putUrl=`${api}/repos/${repo}/contents/${encodeURIComponent(path)}`;
    const commitRes=await fetch(putUrl,{ method:'PUT', headers, body:JSON.stringify({ message:`Add rating for ${entry.ground_id} at ${now}`, content:newContent, branch, sha })});
    if(!commitRes.ok){ const t=await commitRes.text().catch(()=> ''); return { statusCode: 502, body:'GitHub commit failed: '+t.slice(0,200)}}

    return { statusCode: 200, body: JSON.stringify({ ok:true }) };
  } catch (err) {
    return { statusCode: 500, body: 'Error: '+(err && err.message) };
  }
}
