import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMatchHistory,updateMatches} from '../scripts/opgg-matches.mjs';
import {BASE_START,viewOf} from '../scripts/lib.mjs';
import {readFileSync} from 'node:fs';
const match=(id,startAt,result='WIN',queue='SOLORANKED')=>({id,startAt,result,queue});
const history=(matches)=>({matches,valid:true,sourceUpdatedAt:BASE_START});
test('compte après 23h17 Paris, exclut Flex et remakes, déduplique les collectes',()=>{
 const games=[match('before','2026-10-31T23:16:59+01:00'),match('win','2026-11-01T07:17:00+09:00'),match('loss','2026-10-31T23:30:00+01:00','LOSE'),match('flex','2026-11-01T00:00:00Z','WIN','FLEXRANKED'),match('remake','2026-11-01T01:00:00Z','REMAKE')];
 const u=updateMatches({wins:123,losses:456},history(games),BASE_START);
 assert.equal(u.wins,1);assert.equal(u.losses,1);assert.equal(u.matchHistoryStatus,'covered');
 const next=updateMatches(u,history(games),BASE_START);assert.equal(next.wins,1);assert.equal(next.losses,1);
});
test('détecte les trous et les referme seulement quand une page relie les périodes',()=>{
 let u=updateMatches({},history([match('a','2026-10-31T21:00:00Z'),match('b','2026-10-31T23:00:00Z')]),BASE_START);
 u=updateMatches(u,history([match('c','2026-11-01T02:00:00Z'),match('d','2026-11-01T03:00:00Z')]),BASE_START);
 assert.equal(u.matchHistoryStatus,'partial');
 u=updateMatches(u,history([match('a','2026-10-31T21:00:00Z')]),BASE_START);assert.equal(u.matchHistoryStatus,'partial');
 u=updateMatches(u,history([match('b','2026-10-31T23:00:00Z'),match('c','2026-11-01T02:00:00Z')]),BASE_START);assert.equal(u.matchHistoryStatus,'covered');
 u=updateMatches(u,{matches:[],valid:false},BASE_START);assert.equal(u.wins,3);assert.equal(u.matchHistoryStatus,'unavailable');
});
test('lit le JSON-LD public avec identité, résultat et fuseau horaire vérifiés',()=>{
 const action={'@type':'PlayGameAction',agent:{'@id':'player'},startTime:'2026-11-01T07:18:00+09:00',additionalProperty:[{name:'matchId',value:'m1'},{name:'queueType',value:'SOLORANKED'},{name:'result',value:'WIN'}]};
 const html='<script type="application/ld+json">'+JSON.stringify({'@graph':[{'@type':'Person','@id':'player',name:'Test#EUW'},{'@type':'ItemList','@id':'url#recent-games',itemListElement:[{item:action}]}]})+'</script>';
 const h=parseMatchHistory(html,'test#euw');assert.equal(h.valid,true);assert.equal(h.matches[0].startAt,'2026-10-31T22:18:00.000Z');
 assert.equal(parseMatchHistory(html,'wrong#EUW').valid,false);
 assert.equal(parseMatchHistory('<html>captcha</html>','Test#EUW').valid,false);
});
test('les références corrigées remettent les LP nets à zéro',()=>{
 const cfg=JSON.parse(readFileSync(new URL('../config/players.json',import.meta.url)));
 for(const [name,tier,division,lp] of [['0nil0','DIAMOND','IV',3],['ciron','EMERALD','I',28]]){
  const p=cfg.players.find(x=>x.gameName===name);assert.deepEqual([p.baseline.tier,p.baseline.division,p.baseline.lp],[tier,division,lp]);
  assert.equal(viewOf(p,{rank:{tier,division,lp}},'ok').lpDelta,0);
 }
});
