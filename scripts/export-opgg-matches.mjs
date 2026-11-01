/** Génère un registre de matchs vérifiés à partir de l'historique OP.GG déjà collecté.
 * Aucune requête supplémentaire ni clé Riot, aucun champion deviné.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const getJson=(url)=>JSON.parse(readFileSync(url,'utf8'));
const normalizeChampion=(x)=>typeof x==='string' && /^[A-Za-z][A-Za-z0-9]{1,29}$/.test(x.replace(/[^A-Za-z0-9]/g,''))?x.replace(/[^A-Za-z0-9]/g,''):null;
export function buildMatchFeed(config,state,existing={matches:[]}) {
  const start=Date.parse(config.startAt);
  if(!Number.isFinite(start)) throw new Error('Date de tournoi invalide');
  const members=new Set(config.players.map(p=>p.id));
  const map=new Map();
  for(const match of (Array.isArray(existing.matches)?existing.matches:[])){
    if(!members.has(match?.playerId) || typeof match.id!=='string' || match.queueId!==420 ||
      !['V','D'].includes(match.result)||!Number.isFinite(Date.parse(match.playedAt))||
      Date.parse(match.playedAt)<start)continue;
    map.set(match.playerId+':'+match.id,{...match});
  }
  for(const player of config.players) {
    const ledger=state.players?.[player.id]?.matchLedger??{};
    for(const match of Object.values(ledger)){
      if(!match||typeof match.id!=='string'||!match.id||match.queue!=='SOLORANKED'||!['WIN','LOSE'].includes(match.result))continue;
      const time=Date.parse(match.startAt);
      if(!Number.isFinite(time)||time<start)continue;
      const key=player.id+':'+match.id;
      const old=map.get(key);
      const champion=normalizeChampion(match.champion)||normalizeChampion(old?.champion);
      map.set(key,{
        playerId:player.id,id:match.id,playedAt:new Date(time).toISOString(),
        queueId:420,result:match.result==='WIN'?'V':'D',
        ...(champion?{champion}:{}),
        source:old?.source==='manual-confirmed-matches'?'manual-confirmed-matches':'opgg-structured-history'
      });
    }
  }
  const matches=[...map.values()].sort((a,b)=>Date.parse(a.playedAt)-Date.parse(b.playedAt)||a.playerId.localeCompare(b.playerId)||a.id.localeCompare(b.id));
  return {startAt:config.startAt,source:'opgg-structured-history-and-confirmed-manual',
    note:'Matchs SoloQ datés et identifiés issus des relevés OP.GG ou ajoutés après confirmation. Portraits seulement si champion explicitement identifié. Historique potentiellement incomplet.', matches};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const config=getJson(new URL('../config/players.json',import.meta.url));
  const state=getJson(new URL('../state/opgg-state.json',import.meta.url));
  const dest=new URL('../public/data/matches.json',import.meta.url);
  const old=getJson(dest);
  const feed=buildMatchFeed(config,state,old);
  const value=JSON.stringify(feed,null,2)+'\n';
  if(value!==readFileSync(dest,'utf8'))writeFileSync(dest,value);
  console.log('Matchs SoloQ documentés :',feed.matches.length,'; champions attestés :',feed.matches.filter(m=>m.champion).length);
}
