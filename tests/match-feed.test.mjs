import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMatchFeed} from '../scripts/export-opgg-matches.mjs';
import {parseMatchHistory,updateMatches} from '../scripts/opgg-matches.mjs';
const start='2026-10-31T22:17:00.000Z';
test('n importe que les parties SoloQ du tournoi, sans inventer de champion',()=>{
 const cfg={startAt:start,players:[{id:'p1'}]};
 const state={players:{p1:{matchLedger:{
  a:{id:'a',startAt:'2026-10-31T21:00:00Z',queue:'SOLORANKED',result:'WIN'},
  b:{id:'b',startAt:'2026-11-01T01:00:00Z',queue:'FLEXRANKED',result:'LOSE'},
  c:{id:'c',startAt:'2026-11-01T02:00:00Z',queue:'SOLORANKED',result:'WIN'},
  d:{id:'d',startAt:'2026-11-01T03:00:00Z',queue:'SOLORANKED',result:'LOSE',champion:'Miss Fortune'}
 }}}};
 const feed=buildMatchFeed(cfg,state);
 assert.equal(feed.matches.length,2);
 assert.deepEqual(feed.matches.map(x=>x.result),['V','D']);
 assert.equal(feed.matches[0].champion,undefined);
 assert.equal(feed.matches[1].champion,'MissFortune');
});
test('les matchs ajoutés manuellement sont préservés et les doublons fusionnés',()=>{
 const cfg={startAt:start,players:[{id:'p1'}]};
 const old={matches:[{playerId:'p1',id:'c',playedAt:'2026-11-01T01:00:00Z',queueId:420,result:'D',champion:'Ahri',source:'manual-confirmed-matches'}]};
 const state={players:{p1:{matchLedger:{c:{id:'c',startAt:'2026-11-01T01:00:00Z',queue:'SOLORANKED',result:'LOSE'}}}}};
 const feed=buildMatchFeed(cfg,state,old);
 assert.equal(feed.matches.length,1);
 assert.equal(feed.matches[0].champion,'Ahri');
});
test('extrait le champion seulement lorsque la partie le déclare explicitement',()=>{
 const person={'@type':'Person','@id':'#p',name:'Test#EUW'};
 const match={'@type':'PlayGameAction',agent:{'@id':'#p'},startTime:'2026-11-01T04:00:00Z',additionalProperty:[
 {name:'matchId',value:'EUW1_123'},{name:'queueType',value:'SOLORANKED'},{name:'result',value:'WIN'},{name:'champion',value:'Lee Sin'}]};
 const obj={'@graph':[person,{'@type':'ItemList','@id':'#recent-games',itemListElement:[{item:match}]}]};
 const parsed=parseMatchHistory('<script type="application/ld+json">'+JSON.stringify(obj)+'</script>','Test#EUW');
 assert.equal(parsed.valid,true);
 assert.equal(parsed.matches[0].champion,'LeeSin');
 const previous={matchLedger:{EUW1_123:{id:'EUW1_123',champion:'Ahri'}}};
 const updated=updateMatches(previous,{matches:parsed.matches.map(x=>({...x,champion:undefined})),valid:true},'2026-11-01T05:00:00Z');
 assert.equal(updated.matchLedger.EUW1_123.champion,'Ahri');
});
