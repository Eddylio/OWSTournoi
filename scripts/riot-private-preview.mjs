/**
 * OWS TOURNOI — Test PRIVÉ de l'API Riot.
 * Ne publie jamais les données sur GitHub Pages.
 * Lance localement : RIOT_API_KEY=... node scripts/riot-private-preview.mjs
 * Préférer un gestionnaire de secrets ou un fichier .env non commité.
 */
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
import {scoreOf} from './lib.mjs';

const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(readFileSync(resolve(projectRoot,'config/players.json'),'utf8'));
const token=process.env.RIOT_API_KEY;
if(!token || !/^RGAPI-/.test(token)) {
  console.error('Définis RIOT_API_KEY dans ton environnement, sans la mettre dans le code ni dans GitHub.');
  process.exit(1);
}
if(Date.parse(config.startAt)!==Date.parse('2026-10-31T22:17:00.000Z')) throw new Error('Date du tournoi modifiée.');
const startTime=Math.floor(Date.parse(config.startAt)/1000);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let lastRequest=0;
async function getRiotJson(url,attempt=0){
  const now=Date.now(),delay=Math.max(0,1500-(now-lastRequest));
  if(delay) await sleep(delay);
  lastRequest=Date.now();
  const response=await fetch(url,{headers:{'X-Riot-Token':token,Accept:'application/json'},signal:AbortSignal.timeout(20000)});
  if(response.status===429 && attempt<3) {
    const retry=Number(response.headers.get('Retry-After'));
    await sleep(Number.isFinite(retry)&&retry>=1&&retry<=120?retry*1000:60000);
    return getRiotJson(url,attempt+1);
  }
  if(!response.ok)throw new Error('API Riot HTTP '+response.status+(response.status===403?' : clé invalide, expirée ou accès non autorisé':''));
  return response.json();
}
const q=encodeURIComponent;
const accountUrl=(name,tag)=>'https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/'+q(name)+'/'+q(tag);
const leagueUrl=puuid=>'https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/'+q(puuid);
const idsUrl=(puuid,start)=>'https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/'+q(puuid)+'/ids?queue=420&startTime='+startTime+'&start='+start+'&count=100';
const matchUrl=id=>'https://europe.api.riotgames.com/lol/match/v5/matches/'+q(id);
export function summarizeMatches(matches,puuid){
  const filtered=matches.filter(m=>m?.info?.queueId===420 && m.info.participants?.some(p=>p.puuid===puuid))
    .map(m=>{const p=m.info.participants.find(p=>p.puuid===puuid);
      return {id:m.metadata?.matchId??'',
        playedAt:new Date(m.info.gameStartTimestamp||m.info.gameCreation).toISOString(),
        champion:p.championName, result:p.win?'V':'D',
        remake:!!p.gameEndedInEarlySurrender || Number(m.info.gameDuration)<300};
    }).filter(m=>!m.remake && m.id && Date.parse(m.playedAt)>=Date.parse(config.startAt))
    .sort((a,b)=>Date.parse(a.playedAt)-Date.parse(b.playedAt));
  const counts=new Map();for(const m of filtered)if(m.champion)counts.set(m.champion,(counts.get(m.champion)||0)+1);
  const champions=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3).map(([name,games])=>({name,games}));
  const wins=filtered.filter(m=>m.result==='V').length, losses=filtered.length-wins;
  return {games:filtered.length,wins,losses,winrate:filtered.length?Math.round(wins/filtered.length*1000)/10:null,topChampions:champions,recentForm:filtered.slice(-3).map(m=>m.result),matches:filtered};
}
async function fetchParticipant(p){
  const account=await getRiotJson(accountUrl(p.gameName,p.tagLine));
  const puuid=account.puuid;
  const ranks=await getRiotJson(leagueUrl(puuid));
  const solo=Array.isArray(ranks)?ranks.find(r=>r.queueType==='RANKED_SOLO_5x5'):null;
  const ids=[];let truncated=false;
  // Maximum 100 parties par joueur pour éviter des requêtes excessives avec une clé personnelle.
  for(let page=0;page<1;page++){
    const next=await getRiotJson(idsUrl(puuid,page*100));
    if(!Array.isArray(next))throw new Error('Liste de matchs inattendue');
    ids.push(...next);
    if(next.length===100)truncated=true;
    if(next.length<100)break;
  }
  const matches=[];
  for(const id of new Set(ids)){matches.push(await getRiotJson(matchUrl(id)));}
  const summary=summarizeMatches(matches,puuid);
  const current=solo?{tier:solo.tier,division:solo.rank??null,lp:solo.leaguePoints}:null;
  const baselineScore=scoreOf(p.baseline?.tier,p.baseline?.division,p.baseline?.lp);
  const currentScore=current?scoreOf(current.tier,current.division,current.lp):null;
  return {id:p.id,gameName:p.gameName,tagLine:p.tagLine,rank:current,
    lpDelta:baselineScore!==null&&currentScore!==null?currentScore-baselineScore:null,
    ...summary,historyMayBeIncomplete:truncated};
}
async function main(){
  const output={source:'riot-personal-private-local-test',privateOnly:true,startAt:config.startAt,
    generatedAt:new Date().toISOString(),players:[]};
  for(const p of config.players){
    try { const record=await fetchParticipant(p);output.players.push(record);
      console.log(p.gameName+'#'+p.tagLine+' : '+(record.rank?record.rank.tier+' '+(record.rank.division||'')+' '+record.rank.lp+' LP':'non classé')+', '+record.games+' parties');
    } catch (error) { output.players.push({id:p.id,gameName:p.gameName,tagLine:p.tagLine,error:error.message});
      console.warn('Erreur pour '+p.gameName+'#'+p.tagLine+': '+error.message); }
  }
  const folder=resolve(projectRoot,'.private');mkdirSync(folder,{recursive:true});
  const filename=resolve(folder,'riot-preview.json');
  writeFileSync(filename,JSON.stringify(output,null,2)+'\n',{mode:0o600});
  console.log('Résultats privés enregistrés dans .private/riot-preview.json (ignoré par Git).');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(error=>{
  console.error('Échec de la collecte privée : '+error.message);process.exitCode=1;
});
