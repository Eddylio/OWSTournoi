/** Low-frequency, best-effort OP.GG public-page reader; requires no Riot key.
 * No bypass of robots, CAPTCHA, login, rate limits or 403/429 protections.
 * No automatic OP.GG refresh-button invocation. Can fail after a site change.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {BASE_START,makeBaseline,viewOf,scoreOf} from './lib.mjs';
import {parseOpggHtml} from './opgg-parser.mjs';
import {parseMatchHistory,updateMatches} from './opgg-matches.mjs';
const read=(u,fallback)=>{try{return JSON.parse(readFileSync(u,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
const save=(u,o)=>writeFileSync(u,JSON.stringify(o,null,2)+'\n');
const cfg=read(new URL('../config/players.json',import.meta.url),{});
if(cfg.startAt!==BASE_START)throw new Error('Date de départ modifiée');
const stateURL=new URL('../state/opgg-state.json',import.meta.url);
const latestURL=new URL('../public/data/latest.json',import.meta.url);
const historyURL=new URL('../public/data/history.json',import.meta.url);
const state=read(stateURL,{players:{},lastRunAt:null});
const prev=read(latestURL,makeBaseline(cfg));
const hist=read(historyURL,{startAt:BASE_START,snapshots:[]});
const oldPlayers=new Map(prev.players.map(p=>[p.id,p]));
const now=new Date().toISOString();
let successes=0,failures=0;
const players=[];
for(const p of cfg.players){
  const previous=state.players[p.id]??{};
  const id=`${p.gameName}#${p.tagLine}`;
  // Use the exact user-supplied profile URL (no hidden refresh endpoint).
  const url=p.opggUrl||`https://op.gg/fr/lol/summoners/euw/${encodeURIComponent(p.gameName)}-${encodeURIComponent(p.tagLine)}`;
  try {
    const res=await fetch(url,{redirect:'follow',headers:{'User-Agent':'SOLOQ-Sprint/1.0 (personal non-commercial stats tracker; no automated refresh)',Accept:'text/html'},signal:AbortSignal.timeout(25000)});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    const html=await res.text();
    if(html.length>5_000_000)throw new Error('HTML trop volumineux');
    const parsed=parseOpggHtml(html);
    if(!parsed)throw new Error('SoloQ introuvable dans le HTML public (structure OP.GG potentiellement modifiée)');
    const updated=updateMatches({...previous,rank:{tier:parsed.tier,division:parsed.division,lp:parsed.lp},lastSuccessAt:now},parseMatchHistory(html,id),now);
    state.players[p.id]=updated;
    players.push({...viewOf(p,updated,'ok'),lastSuccessAt:now,trackerStartsAt:updated.trackerStartsAt??null});
    successes++;
    console.log(id,`${parsed.tier} ${parsed.division||''} ${parsed.lp} LP`);
  }catch(e){
    failures++;
    console.warn(id,'non synchronisé :',e.message);
    // Keep previously verified values and expose stale status; do not invent or zero them.
    if(previous.rank)players.push({...viewOf(p,previous,'stale'),lastSuccessAt:previous.lastSuccessAt??null,trackerStartsAt:previous.trackerStartsAt??null});
    else players.push({...oldPlayers.get(p.id)??viewOf(p,null,'baseline'),status:'stale'});
  }
  await delay(3500); // At most 17 profile page requests per scheduled run.
}
if(!successes){
  console.warn('Aucun profil OP.GG lisible : aucun état publié, anciennes données conservées.');
  process.exitCode=1;
} else {
  const latest={eventName:cfg.eventName,source:'opgg',updatedAt:now,startAt:BASE_START,players,collectionNote:'OP.GG, consultation des pages publiques seulement. Aucun rafraîchissement forcé. Victoires et défaites SoloQ comptées par identifiant de partie depuis le 31/10/2026 à 23:17 Paris. Historique partiel signalé si les pages ne couvrent pas toute la période.'};
  state.lastRunAt=now;
  const playerIndex=new Map(cfg.players.map(p=>[p.id,p]));
  for(const snap of hist.snapshots){
    if(snap.week===0)continue;
    for(const item of snap.players||[]){
      const b=playerIndex.get(item.id)?.baseline;
      if(!b)continue;
      const score=scoreOf(item.tier,item.division,item.lp),base=scoreOf(b.tier,b.division,b.lp);
      item.lpDelta=score!==null&&base!==null?score-base:null;
    }
  }
  const week=Math.floor((Date.parse(now)-Date.parse(BASE_START))/(7*24*3600*1000));
  if(week>=1&&!hist.snapshots.some(x=>x.week===week)){
    hist.snapshots.push({week,capturedAt:now,players:players.map(p=>({id:p.id,lpDelta:p.lpDelta,games:p.games,winrate:p.winrate,tier:p.tier,division:p.division,lp:p.lp}))});
    hist.snapshots.sort((a,b)=>a.week-b.week);
  }
  save(stateURL,state);save(latestURL,latest);save(historyURL,hist);
  console.log(`${successes}/17 fiches OP.GG analysées ; ${failures} échec(s).`);
}
