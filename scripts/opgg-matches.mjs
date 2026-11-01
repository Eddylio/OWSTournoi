import {BASE_START} from './lib.mjs';
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
      matches.push({id:p.matchId,startAt:new Date(time).toISOString(),queue:p.queueType,result:p.result});
    }
    return {matches,valid:matches.length===list.itemListElement.length&&matches.length>0,
      sourceUpdatedAt:graph.find(x=>x['@type']==='ProfilePage')?.dateModified??null};
  }
  return {matches:[],valid:false,sourceUpdatedAt:null};
}
export function updateMatches(previous, history, now){
  const old=previous.matchLedger??{};
  const ledger={...old};
  for(const m of history.matches)ledger[m.id]=m;
  // Retain recent pre-start matches too: they establish overlap on later reads.
  const timestamps=history.matches.map(x=>Date.parse(x.startAt));
  const oldest=Math.min(...timestamps),newest=Math.max(...timestamps);
  const start=Date.parse(BASE_START);
  const oldNewest=Math.max(...Object.values(old).map(x=>Date.parse(x.startAt)));
  const windows=[...(previous.matchCoverageWindows??[])];
  if(history.valid)windows.push([oldest,newest]);
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
  return {...previous,matchLedger:ledger,matchCoverageWindows:merged,matchHistoryComplete:complete,
    matchHistoryStatus:history.valid?(complete?'covered':'partial'):'unavailable',
    matchHistoryReadAt:history.valid?now:previous.matchHistoryReadAt??null,
    sourceUpdatedAt:history.sourceUpdatedAt??previous.sourceUpdatedAt??null,
    trackerStartsAt:BASE_START,wins,losses,trackedWins:wins,trackedLosses:losses,
    latestMatchAt:Number.isFinite(newest)?new Date(Math.max(newest,oldNewest)).toISOString():previous.latestMatchAt??null};
}
