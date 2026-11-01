import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOpggHtml,updateCounter} from '../scripts/opgg-parser.mjs';
test('repère la SoloQ dans le JSON et ignore le Flex',()=>{
 const html=`<html><script type="application/json">${JSON.stringify({data:{ranked:{solo:{tier:'GOLD',rank:'IV',lp:24,wins:51,losses:40},flex:{tier:'DIAMOND',rank:'II',lp:90,wins:5,losses:4}}}})}</script></html>`;
 assert.deepEqual(parseOpggHtml(html),{tier:'GOLD',division:'IV',lp:24,wins:51,losses:40});
});
test('extrait rang et LP depuis un fragment de page Solo/Duo',()=>{
 const html='<html><section><h3>Ranked Solo/Duo</h3><span>Silver IV 7 LP 32W 31L</span></section><div>Ranked Flex Diamond IV 88 LP</div></html>';
 assert.deepEqual(parseOpggHtml(html),{tier:'SILVER',division:'IV',lp:7,wins:32,losses:31});
});
test('pas de rang inventé si la page est bloquée ou n’affiche que du Flex',()=>{
 assert.equal(parseOpggHtml('<html><body>Access denied - captcha</body></html>'),null);
 assert.equal(parseOpggHtml('<html><body>Ranked Flex Diamond IV 55 LP</body></html>'),null);
});
test('refuse les LP contradictoires entre deux blocs SoloQ',()=>{
 const html=`<html><script type="application/json">${JSON.stringify({a:{solo:{tier:'GOLD',rank:'IV',lp:24}},b:{solo:{tier:'GOLD',rank:'IV',lp:34}}})}</script></html>`;
 assert.equal(parseOpggHtml(html),null);
});
test('les parties ne commencent qu’au premier relevé, sans réinitialisation',()=>{
 const at='2026-11-01T10:00:00.000Z';
 let p=updateCounter({}, {tier:'GOLD',division:'IV',lp:24,wins:120,losses:80},at);
 assert.equal(p.wins,0);assert.equal(p.losses,0);
 p=updateCounter(p,{tier:'GOLD',division:'IV',lp:39,wins:122,losses:81},at);
 assert.equal(p.wins,2);assert.equal(p.losses,1);
 p=updateCounter(p,{tier:'GOLD',division:'IV',lp:45,wins:122,losses:81},at);
 assert.equal(p.wins,2);assert.equal(p.losses,1);
});
test('lit le format français observé sur OP.GG avec divisions numériques et commentaires React',()=>{
 const html='<section><span>Classé en solo/duo</span><strong>Platine 3</strong><span>64<!-- --> LP</span><span>171<!-- -->V<!-- --> <!-- -->166<!-- -->D</span><strong>Platine 2</strong><span>75 LP Top Tier</span><div>Classé en solo/duo Saison Palier LP S2025 Or 3 25</div></section><section>Classé flexible Platine 2 91 LP 49 V 34 D</section>';
 assert.deepEqual(parseOpggHtml(html),{tier:'PLATINUM',division:'III',lp:64,wins:171,losses:166});
});
test('normalise accents, divisions et hauts paliers français',()=>{
 for(const [rank,tier,division,lp] of [['Émeraude 1 65','EMERALD','I',65],['Or 4 24','GOLD','IV',24],['Argent 4 7','SILVER','IV',7],['Maître 54','MASTER',null,54],['Grand Maître 620','GRANDMASTER',null,620]]){
  assert.deepEqual(parseOpggHtml(`<section>Classé en solo/duo ${rank} LP 12 Victoires 10 Défaites</section>`),{tier,division,lp,wins:12,losses:10});
 }
});
test('ne prend pas le Flex ou un ancien rang après une SoloQ non classée',()=>{
 assert.equal(parseOpggHtml('<section>Classé en solo/duo Non classé</section><section>Classé flexible Diamant 2 50 LP 20 V 10 D</section>'),null);
 assert.equal(parseOpggHtml('<section>Classé en solo/duo Saison Palier LP S2025 Or 3 25 LP</section>'),null);
 assert.equal(parseOpggHtml('<script type="application/json">{"history":{"tier":"GOLD","rank":"IV","lp":24}}</script>'),null);
});
test('les compteurs absents ne sont pas empruntés au Top Tier ou au Flex',()=>{
 assert.deepEqual(parseOpggHtml('<section>Classé en solo/duo Or 4 24 LP Or 1 90 LP Top Tier</section><section>Classé flexible Argent 1 50 LP 20 V 10 D</section>'),{tier:'GOLD',division:'IV',lp:24,wins:null,losses:null});
});
