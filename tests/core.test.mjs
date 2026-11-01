import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {START_SECONDS,BASE_START,scoreOf,viewOf,makeBaseline} from '../scripts/lib.mjs';
const config=JSON.parse(readFileSync(new URL('../config/players.json',import.meta.url),'utf8'));
test('Date de départ : 31 octobre 2026 23:17 Paris',()=>{
  assert.equal(BASE_START,'2026-10-31T22:17:00.000Z');
  assert.equal(START_SECONDS,1793485020);
});
test('Tous les 17 joueurs et leurs IDs sont présents',()=>{
  assert.equal(config.players.length,17);
  assert.equal(new Set(config.players.map(p=>p.id)).size,17);
  assert.ok(config.players.find(p=>p.gameName==='0nil0'));
  assert.ok(config.players.find(p=>p.gameName==='Own by Fakir'));
});
test('Score avec montée de division, changement de palier et Master+',()=>{
  assert.equal(scoreOf('PLATINUM','IV',70),1670);
  assert.equal(scoreOf('EMERALD','IV',20),2020);
  assert.equal(scoreOf('DIAMOND','II',15),2615);
  assert.equal(scoreOf('MASTER',null,54),2854);
  assert.equal(scoreOf('GRANDMASTER',null,150),2950);
  assert.equal(scoreOf('CHALLENGER',null,450),3250);
  assert.equal(scoreOf('DIAMOND','III',5)-scoreOf('EMERALD','I',50),155);
  assert.equal(scoreOf(null,null,null),null);
});
test('Départ à zéro et None, LP de départ inconnu',()=>{
  const b=makeBaseline(config);
  assert.ok(b.players.every(p=>p.games===0&&p.lpDelta===0&&p.winrate===null));
  assert.equal(b.players.filter(p=>p.baselineKnown===false).length,0);
  assert.equal(b.players.find(p=>p.gameName==='WRATH').lp,14);
  assert.equal(b.players.find(p=>p.gameName==='0nil0').lp,74);
  assert.equal(b.players.find(p=>p.gameName==='ShadowPhen').lp,24);
  assert.equal(b.players.find(p=>p.gameName==='ShadowPhen').division,'IV');
  assert.equal(b.players.find(p=>p.gameName==='TheBerserker226').lp,7);
});
test('Victoires, défaites, winrate et LP nets calculés',()=>{
  const p=config.players.find(p=>p.gameName==='taudinico');
  const v=viewOf(p,{wins:3,losses:1,rank:{tier:'PLATINUM',division:'II',lp:31}},'ok');
  assert.equal(v.games,4);assert.equal(v.winrate,75);
  assert.equal(v.lpDelta,(1800+31)-(1700+64));
});
