import {readFileSync} from 'node:fs';
import {BASE_START} from './lib.mjs';
const championAssets=JSON.parse(readFileSync(new URL('../config/champion-assets.json',import.meta.url),'utf8'));
const normalizeName=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const championIndex=new Map(Object.entries(championAssets.champions).flatMap(([id,c])=>c.aliases.map(a=>[normalizeName(a),{id,name:c.name,icon:c.icon}])));
export const resolveChampion=name=>championIndex.get(normalizeName(name))??null;
export function summarizeMatches(ledger){
  const games=Object.values(ledger).filter(m=>Date.parse(m.startAt)>=Date.parse(BASE_START)&&m.queue==='SOLORANKED'&&['WIN','LOSE'].includes(m.result)).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt)||a.id.localeCompare(b.id));
  const counts=new Map();
  for(const m of games){const c=championIndex.get(normalizeName(m.champion));if(!c)continue;
    const row=counts.get(c.id)??{...c,games:0,lastPlayedAt:m.startAt};row.games++;row.lastPlayedAt=m.startAt;counts.set(c.id,row);
  }
  return {topChampions:[...counts.values()].sort((a,b)=>b.games-a.games||Date.parse(b.lastPlayedAt)-Date.parse(a.lastPlayedAt)||a.id.localeCompare(b.id)).slice(0,3),recentForm:games.slice(-5).map(m=>({result:m.result==='WIN'?'V':'D',startAt:m.startAt,champion:m.champion??null}))};
}
// Read dated matches explicitly published by OP.GG, without executing scripts.
export function parseMatchHistory(html, riotId){
  for(const m of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    let graph;try{const d=JSON.parse(m[1]);graph=d['@graph']??[d];}catch{continue;}
    const person=graph.find(x=>x['@type']==='Person'&&x.name?.toLowerCase()===riotId.toLowerCase());
    if(!person)continue;
    const list=graph.find(x=>x['@type']==='ItemList'&&x['@id']?.endsWith('#recent-games'));
    if(!list||!Array.isArray(list.itemListElement))continue;
    const matches=[];
    for(const row of list.itemListElement){
      const x=row.item;if(x?.['@type']!=='PlayGameAction'||x.agent?.['@id']!==person['@id'])continue;
      const p=Object.fromEntries((x.additionalProperty??[]).map(v=>[v.name,v.value]));
      const time=Date.parse(x.startTime);
      if(typeof p.matchId!=='string'||!p.matchId||!Number.isFinite(time)||!p.queueType||!p.result)continue;
      matches.push({id:p.matchId,startAt:new Date(time).toISOString(),queue:p.queueType,result:p.result,champion:resolveChampion(p.champion??p.championName??p.playedChampion)?.id??null});
    }
    return {matches,valid:matches.length===list.itemListElement.length&&matches.length>0,
      sourceUpdatedAt:graph.find(x=>x['@type']==='ProfilePage')?.dateModified??null};
  }
  return {matches:[],valid:false,sourceUpdatedAt:null};
}
export function updateMatches(previous, history, now){
  const old=previous.matchLedger??{};
  const ledger={...old};
  for(const m of history.matches)ledger[m.id]={...old[m.id],...m,champion:m.champion??old[m.id]?.champion??null};
  // Retain recent pre-start matches too: they establish overlap on later reads.
  const timestamps=history.matches.map(x=>Date.parse(x.startAt)).filter(Number.isFinite);
  const oldest=Math.min(...timestamps),newest=Math.max(...timestamps);
  const start=Date.parse(BASE_START);
  const oldNewest=Math.max(...Object.values(old).map(x=>Date.parse(x.startAt)).filter(Number.isFinite));
  const windows=[...(previous.matchCoverageWindows??[])];
  if(history.valid&&Number.isFinite(oldest)&&Number.isFinite(newest))windows.push([oldest,newest]);
  windows.sort((a,b)=>a[0]-b[0]);
  const merged=[];
  for(const interval of windows){
    const last=merged.at(-1);
    if(last&&interval[0]<=last[1])last[1]=Math.max(last[1],interval[1]);
    else merged.push([...interval]);
  }
  const last=merged.at(-1);
  const complete=!!last&&last[0]<=start;
  const counted=Object.values(ledger).filter(x=>Date.parse(x.startAt)>=start&&x.queue==='SOLORANKED');
  const wins=counted.filter(x=>x.result==='WIN').length;
  const losses=counted.filter(x=>x.result==='LOSE').length;
  return {...previous,...summarizeMatches(ledger),matchLedger:ledger,matchCoverageWindows:merged,matchHistoryComplete:complete,
    matchHistoryStatus:history.valid?(complete?'covered':'partial'):'unavailable',
    matchHistoryReadAt:history.valid?now:previous.matchHistoryReadAt??null,
    sourceUpdatedAt:history.sourceUpdatedAt??previous.sourceUpdatedAt??null,
    trackerStartsAt:BASE_START,wins,losses,trackedWins:wins,trackedLosses:losses,
    latestMatchAt:Number.isFinite(newest)?new Date(Math.max(newest,oldNewest)).toISOString():previous.latestMatchAt??null};
}
