export const tierBases = {IRON:0,BRONZE:400,SILVER:800,GOLD:1200,PLATINUM:1600,EMERALD:2000,DIAMOND:2400,MASTER:2800,GRANDMASTER:2800,CHALLENGER:2800};
export const divBases = {IV:0,III:100,II:200,I:300};
export function scoreOf(tier, division, lp) {
  if (!Object.hasOwn(tierBases,tier) || !Number.isFinite(lp)) return null;
  if (['MASTER','GRANDMASTER','CHALLENGER'].includes(tier)) return 2800 + lp;
  if (!Object.hasOwn(divBases,division)) return null;
  return tierBases[tier] + divBases[division] + lp;
}
export const BASE_START = '2026-10-31T22:17:00.000Z';
export const START_SECONDS = Math.floor(Date.parse(BASE_START)/1000);
export function viewOf(p, saved, status='baseline') {
  const b = p.baseline || {};
  const current = saved?.rank || {tier:b.tier,division:b.division,lp:b.lp};
  const baselineScore = scoreOf(b.tier,b.division,b.lp);
  const score=scoreOf(current.tier,current.division,current.lp);
  const games= status==='baseline' ? 0 : (saved?.wins||0)+(saved?.losses||0);
  const wins=status==='baseline'?0:(saved?.wins||0);
  const losses=status==='baseline'?0:(saved?.losses||0);
  const rankKnown=!!current.tier;
  return {
    id:p.id,gameName:p.gameName,tagLine:p.tagLine,
    tier:rankKnown ? current.tier : null,
    division:rankKnown ? current.division : null,
    lp:rankKnown ? current.lp : null,
    score,baselineScore,baselineKnown:baselineScore!==null,
    lpDelta: status==='baseline' ? 0 : baselineScore!==null&&score!==null ? score-baselineScore : null,
    games,wins,losses,winrate: games ? Math.round(wins/games*1000)/10 : null,
    topChampions:saved?.topChampions??[],recentForm:saved?.recentForm??[],
    matchHistoryStatus:saved?.matchHistoryStatus??'unavailable',sourceUpdatedAt:saved?.sourceUpdatedAt??null,latestMatchAt:saved?.latestMatchAt??null,trackerStartsAt:saved?.trackerStartsAt??null,
    status,baselineNote:b.note || '',baselineSource:b.sourceType||'previous',baselineSourceAt:b.sourceAt||null,baselineTier:b.tier,baselineDivision:b.division,baselineLp:b.lp,opggUrl:p.opggUrl||null,indexedReport:p.indexedReport||null,
  };
}
export function makeBaseline(config) {
  return {eventName:config.eventName,source:'baseline',updatedAt:null,startAt:config.startAt,
    players:config.players.map(p=>viewOf(p,null,'baseline'))};
}
