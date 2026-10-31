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
