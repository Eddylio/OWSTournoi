/** Extract a Solo/Duo rank from public OP.GG HTML. No private API or refresh endpoints.
 * Fail closed rather than attach a Flex rank or a guessed LP to a player.
 */
const TIERS = {IRON:'IRON',FER:'IRON',BRONZE:'BRONZE',SILVER:'SILVER',ARGENT:'SILVER',GOLD:'GOLD',OR:'GOLD',PLATINUM:'PLATINUM',PLATINE:'PLATINUM',EMERALD:'EMERALD',EMERAUDE:'EMERALD',DIAMOND:'DIAMOND',DIAMANT:'DIAMOND',MASTER:'MASTER',MAITRE:'MASTER',GRANDMASTER:'GRANDMASTER',CHALLENGER:'CHALLENGER'};
const HIGH = new Set(['MASTER','GRANDMASTER','CHALLENGER']);
const clean = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const tierOf = value => TIERS[clean(value)] || null;
const divOf = value => {
  if (value === null || value === undefined) return null;
  const v=clean(value);
  return {1:'I',2:'II',3:'III',4:'IV',I:'I',II:'II',III:'III',IV:'IV'}[v] || null;
};
const lpOf = val => {
  if (typeof val==='number' && Number.isFinite(val) && val>=0 && val<=5000) return Math.trunc(val);
  if (typeof val==='string' && /^\d{1,4}$/.test(val.trim())) return Number(val);
  return null;
};
const countOf = val => Number.isInteger(Number(val)) && Number(val)>=0 && Number(val)<=10000 && val!==null && val!==undefined && val!=='' ? Number(val) : null;
function pick(o,keys) {for(const key of keys){if(Object.hasOwn(o,key))return o[key];}return undefined;}
function rankObject(o, context) {
  if(!o || typeof o!=='object' || Array.isArray(o))return null;
  const queue=String(pick(o,['queueType','queue_type','queue','type','mode','gameMode','game_type','queueId'])??'');
  const ctx=(context+' '+queue).toLowerCase();
  if(/flex|ranked_flex|(^|\W)440(\W|$)/.test(ctx))return null;
  const solo=/solo|(^|\W)420(\W|$)/.test(ctx);
  let tier=tierOf(pick(o,['tier','tier_name','tierName','leagueTier','league_tier']));
  let division=divOf(pick(o,['rank','division','divisionName','division_name','tier_rank']));
  let lp=lpOf(pick(o,['lp','leaguePoints','league_points','leaguePoint','point','points','league_point']));
  // OP.GG may put tier and rank into one field (e.g. 'GOLD IV').
  const combined=String(pick(o,['rank','tier','tierName','league'])??'');
  if(!tier){const m=combined.match(/\b(IRON|BRONZE|SILVER|GOLD|PLATINUM|EMERALD|DIAMOND|MASTER|GRANDMASTER|CHALLENGER)\s+(IV|III|II|I)\b/i);if(m){tier=tierOf(m[1]);division=divOf(m[2]);}}
  if(!solo || !tier || lp===null || (!HIGH.has(tier)&&!division))return null;
  const wins=countOf(pick(o,['wins','win','winCount','win_count']));
  const losses=countOf(pick(o,['losses','lose','loss','loseCount','loss_count']));
  return {tier,division:HIGH.has(tier)?null:division,lp,wins,losses,score:solo?5:(context==='root'?0:1)};
}
function jsonCandidates(data) {
  const out=[];let budget=30000;
  function walk(v,context='root',depth=0){
    if(!v || typeof v!=='object'||depth>30||--budget<=0)return;
    if(Array.isArray(v)){for(const item of v.slice(0,400))walk(item,context,depth+1);return;}
    const c=rankObject(v,context);if(c)out.push(c);
    for(const [k,val] of Object.entries(v).slice(0,200)){const label=/solo|(^|\W)420(\W|$)/i.test(k)?'solo':/flex/i.test(k)?'flex':context;walk(val,label,depth+1);}
  }
  walk(data);
  return out;
}
const decode = s => String(s).replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;|&#34;/gi,'"').replace(/&#39;|&apos;/gi,"'");
function parseJsonScripts(html) {
  const candidates=[];
  for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try {candidates.push(...jsonCandidates(JSON.parse(decode(match[1]))));}catch{}
  }
  for(const match of html.matchAll(/<script\b[^>]*id\s*=\s*["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/gi)){
    try {candidates.push(...jsonCandidates(JSON.parse(decode(match[1]))));}catch{}
  }
  return candidates;
}
function textCandidates(html){
  const stripped=decode(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' '))
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const out=[];
  // Only accept a rank immediately after the queue label. A wide window can
  // cross into Flex, season history or the player's peak ("Top Tier").
  const headings=[...stripped.matchAll(/(?:ranked\s+solo(?:\s*\/\s*duo)?|solo\s*\/\s*duo|classe(?:e|ment)?\s+(?:en\s+)?solo(?:\s*\/\s*duo)?)/gi)];
  const pattern=/^\s*(GRAND\s*MASTER|GRAND\s*MAITRE|CHALLENGER|MASTER|MAITRE|IRON|FER|BRONZE|SILVER|ARGENT|GOLD|OR|PLATINUM|PLATINE|EMERALD|EMERAUDE|DIAMOND|DIAMANT)\s*(IV|III|II|I|[1-4])?\s+(\d{1,4})\s*LP\b/i;
  for(const heading of headings){
    const clip=stripped.slice(heading.index+heading[0].length,heading.index+heading[0].length+200);
    const found=clip.match(pattern);
    if(!found)continue;
    const tier=tierOf(clean(found[1]).replace(/\s/g,'').replace('GRANDMAITRE','GRANDMASTER'));
    const division=divOf(found[2]),lp=lpOf(found[3]);
    if(!tier || lp===null || (!division&&!HIGH.has(tier)))continue;
    // Counters must directly follow this rank, never a peak or another queue.
    const record=clip.slice(found[0].length).match(/^\s*(\d{1,4})\s*(?:victoires?|wins?|W|V)\s*(\d{1,4})\s*(?:defaites?|losses|L|D)\b/i);
    out.push({tier,division:HIGH.has(tier)?null:division,lp,wins:record?Number(record[1]):null,losses:record?Number(record[2]):null,score:2});
  }
  return out;
}
/** Returns null if SoloQ rank is ambiguous/unavailable. */
export function parseOpggHtml(html){
  if(typeof html!=='string'||html.length<30)return null;
  const candidates=[...parseJsonScripts(html),...textCandidates(html)].sort((a,b)=>b.score-a.score);
  if(!candidates.length)return null;
  const highest=candidates[0].score;
  const top=candidates.filter(x=>x.score===highest);
  if(top.some(x=>x.tier!==top[0].tier||x.division!==top[0].division||x.lp!==top[0].lp))return null;
  const rank={tier:top[0].tier,division:top[0].division,lp:top[0].lp};
  const detailed=top.find(x=>x.wins!==null && x.losses!==null);
  return {...rank,wins:detailed?.wins??null,losses:detailed?.losses??null};
}
export function updateCounter(record, observation, now){
  const out={...record};
  if(observation.wins!==null && observation.losses!==null){
    if(!Number.isInteger(out.lastSeasonWins)||!Number.isInteger(out.lastSeasonLosses)){
      out.lastSeasonWins=observation.wins;out.lastSeasonLosses=observation.losses;
      out.trackedWins=out.trackedWins??0;out.trackedLosses=out.trackedLosses??0;
      out.trackerStartsAt=out.trackerStartsAt||now;
    } else {
      // If a season reset occurs, keep already counted games but start a new checkpoint.
      out.trackedWins=(out.trackedWins??0)+(observation.wins>=out.lastSeasonWins?observation.wins-out.lastSeasonWins:0);
      out.trackedLosses=(out.trackedLosses??0)+(observation.losses>=out.lastSeasonLosses?observation.losses-out.lastSeasonLosses:0);
      out.lastSeasonWins=observation.wins;out.lastSeasonLosses=observation.losses;
    }
    out.wins=out.trackedWins;out.losses=out.trackedLosses;
  }
  out.rank={tier:observation.tier,division:observation.division,lp:observation.lp};
  out.lastSuccessAt=now;
  return out;
}
