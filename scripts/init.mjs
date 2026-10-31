import { readFileSync, writeFileSync } from 'node:fs';
import {makeBaseline,BASE_START} from './lib.mjs';
const config=JSON.parse(readFileSync(new URL('../config/players.json',import.meta.url),'utf8'));
if(config.startAt!==BASE_START) throw new Error('Date de référence non conforme');
writeFileSync(new URL('../public/data/latest.json',import.meta.url),JSON.stringify(makeBaseline(config),null,2)+'\n');
writeFileSync(new URL('../public/data/history.json',import.meta.url),JSON.stringify({startAt:config.startAt,snapshots:[{week:0,capturedAt:config.startAt,players:config.players.map(p=>({id:p.id,lpDelta:0}))}]},null,2)+'\n');
writeFileSync(new URL('../state/sync-state.json',import.meta.url),JSON.stringify({players:{},lastRunAt:null},null,2)+'\n');
console.log('Fichier de référence généré pour',config.players.length,'joueurs');
