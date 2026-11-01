/* SOLOQ SPRINT — Site statique, aucune clé API dans le navigateur. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const ranks = { IRON: 'Fer', BRONZE: 'Bronze', SILVER: 'Argent', GOLD: 'Or', PLATINUM: 'Platine', EMERALD: 'Émeraude', DIAMOND: 'Diamant', MASTER: 'Maître', GRANDMASTER: 'Grand Maître', CHALLENGER: 'Challenger' };
  const tierClasses = { IRON: 'iron', BRONZE: 'iron', SILVER: 'silver', GOLD: 'gold', PLATINUM: 'platinum', EMERALD: 'emerald', DIAMOND: 'diamond', MASTER: 'master', GRANDMASTER: 'master', CHALLENGER: 'master' };
  const format = new Intl.NumberFormat('fr-FR');
  const fmt = (n) => typeof n === 'number' && Number.isFinite(n) ? format.format(n) : '—';
  const escaped = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const rankName = (p) => p?.tier ? `${ranks[p.tier] || p.tier}${p.division ? ' ' + p.division : ''}` : 'Non classé';
  const riotId = p => `${p.gameName}#${p.tagLine}`;
  const opggUrl = p => 'https://www.op.gg/summoners/euw/' + encodeURIComponent(p.gameName).replace(/%20/g, '%20') + '-' + encodeURIComponent(p.tagLine);
  const estimatedTierScore = p => {
    if (typeof p.score === 'number') return p.score;
    // Permet de positionner les profils au rang connu mais sans LP parmi les divisions,
    // plutôt que de les envoyer tout à la fin du classement.
    const tiers = {IRON:0,BRONZE:400,SILVER:800,GOLD:1200,PLATINUM:1600,EMERALD:2000,DIAMOND:2400,MASTER:2800,GRANDMASTER:2800,CHALLENGER:2800};
    const divisions = {IV:0,III:100,II:200,I:300};
    return Object.hasOwn(tiers,p.tier) ? tiers[p.tier] + (divisions[p.division] ?? 0) - 0.5 : -Infinity;
  };
  const playerScore = estimatedTierScore;
  const relative = n => n > 0 ? `+${fmt(n)}` : fmt(n);
  const initial = { players: [], source: 'baseline', updatedAt: null, startAt: '2026-10-31T22:17:00.000Z' };
  let data = initial;
  let history = { snapshots: [] };
  let matchResults = { matches: [] };
  let matchByPlayer = new Map();
  let dragonVersion = '16.21.1'; // Version de secours, remplacée par la plus récente si disponible.
  let officialChampionIds = new Map();
  let search = '', sortBy = 'progression', tierFilter = 'all';

  // Seules les parties SoloQ (file 420) datées depuis le 31/10/2026 23h17 Paris sont comptées.
  // Données saisies dans data/matches.json ; pas de scraping de l'historique OP.GG.
  function prepareMatchStats() {
    const players = new Set((data.players || []).map(p => p.id));
    const found = new Map();
    const seen = new Set();
    const threshold = Date.parse(initial.startAt);
    const futureLimit = Date.now() + 120 * 60 * 1000;
    for (const m of (Array.isArray(matchResults.matches) ? matchResults.matches : [])) {
      if (!m || !players.has(m.playerId) || m.queueId !== 420 || typeof m.id !== 'string' || !m.id.trim()) continue;
      const time = typeof m.playedAt === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(m.playedAt) ? Date.parse(m.playedAt) : NaN;
      if (!Number.isFinite(time) || time < threshold || time > futureLimit) continue;
      if (!/^[a-zA-Z][a-zA-Z0-9]{1,29}$/.test(String(m.champion || '')) || !['V','D'].includes(m.result)) continue;
      const key = `${m.playerId}:${m.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!found.has(m.playerId)) found.set(m.playerId, []);
      found.get(m.playerId).push({time, id:m.id, champion:m.champion, result:m.result});
    }
    matchByPlayer = new Map();
    for (const [id, games] of found) {
      games.sort((a,b) => b.time - a.time || b.id.localeCompare(a.id));
      const counts = new Map();
      for (const game of games) counts.set(game.champion, (counts.get(game.champion) || 0) + 1);
      const champions = [...counts].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
      matchByPlayer.set(id, { champions: champions.slice(0,3), form: games.slice(0,3).reverse().map(g => g.result), games: games.length });
    }
  }

  function championPortraits(p, variant='table') {
    const champs = matchByPlayer.get(p.id)?.champions;
    if (!champs?.length) return ''; // Aucune partie : aucune icône, même pas un placeholder.
    const icons = champs.map(([champion,count]) => {
      const id = officialChampionIds.get(champion.toLowerCase()) || champion;
      const url = `https://ddragon.leagueoflegends.com/cdn/${dragonVersion}/img/champion/${encodeURIComponent(id)}.png`;
      return `<img class="champion-icon" src="${escaped(url)}" width="26" height="26" loading="lazy" alt="${escaped(champion)}" title="${escaped(champion)} · ${count} partie${count>1?'s':''} depuis le départ" />`;
    }).join('');
    return `<div class="player-champions ${variant==='podium'?'podium-champions':''}" aria-label="Champions les plus joués">${icons}</div>`;
  }

  function formBadges(p) {
    const recent = matchByPlayer.get(p.id)?.form || [];
    if (!recent.length) return '<div class="recent-form no-form" title="Aucune partie renseignée depuis le début">Forme : —</div>';
    return `<div class="recent-form" title="Dernières parties SoloQ : de la plus ancienne à la plus récente"><span class="recent-form-label">FORME</span>${recent.map(r => `<span class="form-result ${r==='V'?'form-win':'form-loss'}" aria-label="${r==='V'?'Victoire':'Défaite'}">${r}</span>`).join('')}</div>`;
  }

  function competitionLeaders() {
    const active = ['riot','opgg'].includes(data.source);
    return [...(data.players || [])].filter(p => Number.isFinite(playerScore(p))).sort((a,b) => {
      const aDelta = active && Number.isFinite(a.lpDelta) ? a.lpDelta : (active ? -Infinity : playerScore(a));
      const bDelta = active && Number.isFinite(b.lpDelta) ? b.lpDelta : (active ? -Infinity : playerScore(b));
      return bDelta - aDelta || playerScore(b) - playerScore(a) || riotId(a).localeCompare(riotId(b),'fr');
    }).slice(0,3);
  }

  async function updateOfficialChampionRegistry() {
    if (!matchByPlayer.size) return;
    try {
      const versions = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      if (!versions.ok) return;
      const list = await versions.json();
      const version = Array.isArray(list) && /^\d+\.\d+\.\d+$/.test(list[0]) ? list[0] : dragonVersion;
      const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
      if (!response.ok) return;
      const metadata = await response.json();
      const registry = new Map();
      for (const champion of Object.values(metadata.data || {})) {
        if (champion?.id) { registry.set(champion.id.toLowerCase(),champion.id); registry.set(String(champion.name||'').toLowerCase().replace(/[^a-z0-9]/g,''),champion.id); }
      }
      dragonVersion = version; officialChampionIds = registry;
      renderPodium();renderTable();
    } catch (error) {console.warn('Icônes Data Dragon : utilisation de la version de secours',error);}
  }

  function sortedPlayers() {
    const all = [...(data.players || [])];
    const isActive = data.source === 'riot' || data.source === 'opgg';
    const score = (p) => {
      switch (sortBy) {
        case 'rank': return playerScore(p);
        case 'games': return p.games ?? -1;
        case 'winrate': return p.games ? (p.winrate ?? -1) : -1;
        default: return isActive ? (typeof p.lpDelta === 'number' ? p.lpDelta : -Infinity) : playerScore(p);
      }
    };
    all.sort((a,b) => score(b) - score(a) || playerScore(b) - playerScore(a) || riotId(a).localeCompare(riotId(b), 'fr'));
    return all.filter(p => {
      const text = riotId(p).toLocaleLowerCase('fr');
      const filter = tierFilter === 'all' || tierFilter.split(',').includes(p.tier);
      return filter && text.includes(search);
    });
  }

  function renderStatus() {
    const live = ['riot','opgg'].includes(data.source) && data.updatedAt;
    const indicator = $('sync-indicator');
    indicator.className = 'sync-light ' + (live ? '' : 'pending');
    $('sync-status').textContent = live ? (data.source==='opgg' ? 'Collecte OP.GG expérimentale' : 'Synchronisation Riot') : 'Références de départ · Collecte OP.GG non encore vérifiée';
    $('sync-date').textContent = live ? 'Dernière collecte partielle : ' + new Date(data.updatedAt).toLocaleString('fr-FR', {timeZone:'Europe/Paris',dateStyle:'medium',timeStyle:'short'}) : 'Références du 31 oct. 2026 · Non actualisées';
    const baselines = (data.players || []).filter(p => p.baselineKnown).length;
    $('baseline-coverage').textContent = `${baselines} / ${data.players.length} références renseignées`;
    $('baseline-coverage').title = 'Références de départ parfois estimées ; attention à la comparaison de LP.';
    const failures = (data.players || []).filter(p => p.status === 'stale' || p.status === 'error');
    if (live && failures.length) $('sync-status').textContent = `${failures.length} fiche(s) sans nouvel accès OP.GG · Autres relevés disponibles`;
    $('table-status').textContent = live ? 'OP.GG : dernières données lisibles, sans garantie de rafraîchissement des profils' : 'Références provisoires · Aucune collecte publique OP.GG confirmée';
    $('ranking-description').textContent = live ? 'Classement par LP nets estimés depuis le rang de référence ; détails et dates par joueur.' : 'Classement initial par rang SoloQ et LP de référence.';
  }

  function renderStats() {
    const list = data.players || [];
    const games = list.reduce((s,p) => s + (p.games || 0), 0);
    const deltas = list.filter(p => typeof p.lpDelta === 'number');
    const lps = deltas.reduce((s,p) => s + p.lpDelta, 0);
    const best = [...list].filter(p => p.games > 0 && typeof p.winrate === 'number').sort((a,b) => b.winrate - a.winrate || b.games - a.games)[0];
    $('stat-players').innerHTML = `${fmt(list.length)}<span class="metric-mini">/ 17</span>`;
    $('stat-games').textContent = fmt(games);
    $('stat-lps').textContent = (lps > 0 ? '+' : '') + fmt(lps);
    $('stat-lps').className = 'metric-value ' + (lps > 0 ? 'positive' : lps < 0 ? 'negative' : '');
    $('stat-wr').textContent = best ? `${best.winrate.toFixed(1).replace('.', ',')}%` : '—';
    $('stat-wr-note').textContent = best ? riotId(best) : 'En attente des premières parties';
    $('player-total').textContent = `${list.length} INVOCATEURS`;
  }

  function renderPodium() {
    const leaders = competitionLeaders();
    if (!leaders.length) { $('podium').innerHTML = '<div class="podium-loading">En attente du classement…</div>'; return; }
    const byPosition = [leaders[1],leaders[0],leaders[2]];
    $('podium').innerHTML = byPosition.map((p,i) => {
      if (!p) return '';
      const place = [2,1,3][i];
      return `<div class="podium-item podium-${place===1?'first':place===2?'second':'third'}"><div class="podium-number">0${place}</div><div class="podium-avatar">${escaped(p.gameName.trim()[0]?.toUpperCase() || '?')}</div><div class="podium-name" title="${escaped(riotId(p))}">${escaped(p.gameName)}</div><div class="podium-meta">${escaped(rankName(p))} · ${fmt(p.lp)} LP</div>${championPortraits(p,'podium')}${formBadges(p)}<div class="podium-step">0${place}</div></div>`;
    }).join('');
  }

  function renderTable() {
    const players = sortedPlayers();
    if (!players.length) { $('players-body').innerHTML = '<tr><td colspan="10" class="loading-row">Aucun joueur ne correspond à cette recherche.</td></tr>'; return; }
    const globalSorted = (() => {
      const q = search, f = tierFilter; search = '';tierFilter='all'; const items = sortedPlayers(); search=q;tierFilter=f;return items;
    })();
    const pos = new Map(globalSorted.map((p,i) => [p.id, i+1]));
    $('players-body').innerHTML = players.map(p => {
      const index = pos.get(p.id), initials = p.gameName.trim().slice(0,1).toUpperCase();
      const isMissing = !p.baselineKnown;
      const sourceLabel = data.source==='opgg' && p.status==='ok' ? 'OP.GG consulté' : data.source==='opgg' && p.status==='stale' ? 'OP.GG indisponible' : data.source==='riot' && p.status==='ok' ? 'API Riot' : (p.baselineSource==='user' ? 'Confirmé par toi' : 'Relevé provisoire');
      const report=p.indexedReport;
      const indexedLabel=report ? `${rankName(report)} · ${fmt(report.lp)} LP` : 'Introuvable';
      const collected = data.source==='opgg' ? (p.lastSuccessAt ? `OP.GG : ${new Date(p.lastSuccessAt).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}` : 'Pas de collecte réussie') : null;
      const sourceDetails = `Départ : ${rankName({tier:p.baselineTier,division:p.baselineDivision})} · ${fmt(p.baselineLp)} LP. ${p.baselineNote || ''}`;
      const lpText = !['riot','opgg'].includes(data.source) ? '0' : isMissing ? '—' : relative(p.lpDelta);
      const tone = !['riot','opgg'].includes(data.source) || isMissing ? 'neutral' : p.lpDelta > 0 ? 'positive' : p.lpDelta < 0 ? 'negative' : 'neutral';
      const wr = p.games ? `${p.winrate.toFixed(1).replace('.',',')}%` : 'None';
      const tier = tierClasses[p.tier] || '';
      return `<tr><td><span class="rank-number ${index===1?'first':''}">${String(index).padStart(2,'0')}</span></td>
        <td><div class="player-cell"><span class="player-avatar ${index<=3?'top':''}">${escaped(initials)}</span><div><div class="player-name" title="${escaped(riotId(p))}">${escaped(p.gameName)}</div><div class="player-tag">#${escaped(p.tagLine)}</div>${championPortraits(p)}<div class="origin-label ${p.baselineSource==='user'?'is-user':''}" title="${escaped(sourceDetails)}">${escaped(sourceLabel)}</div></div></div></td>
        <td><span class="tier-pill ${tier}">${escaped(rankName(p))}</span></td>
        <td class="num"><span class="num-main">${fmt(p.lp)}</span></td>
        <td class="num"><span class="num-main">${fmt(p.games)}</span><div class="player-tag">${p.matchHistoryStatus==='covered'?'Depuis le départ (OP.GG)':p.matchHistoryStatus==='partial'?'Historique partiel':'Historique indisponible'}</div></td>
        <td class="num"><span class="neutral">${fmt(p.wins)} / ${fmt(p.losses)}</span></td>
        <td class="num">${p.games ? `<span class="winbar"><i style="width:${Math.max(0,Math.min(100,p.winrate))}%"></i></span>` : ''}<span class="${p.games?'':'subtle-dash'}">${wr}</span></td>
        <td class="num"><span class="num-main ${tone}" title="${escaped(sourceDetails)}">${lpText}</span></td>
        <td class="indexed-cell" title="${escaped(data.source==='opgg' ? 'Une lecture de page ne garantit pas un rafraîchissement des données côté OP.GG.' : (report ? 'Indexation : '+report.indexedAge+' ; ce n’est pas une mise à jour du profil.' : 'Aucun résultat indexé trouvé'))}">${collected ? `<span class="index-value">${escaped(collected)}</span><small>${p.status==='ok'?'Page lue':'Relevé conservé / non disponible'}</small>${p.latestMatchAt ? `<small>Dernière partie : ${escaped(new Date(p.latestMatchAt).toLocaleString('fr-FR',{timeZone:'Europe/Paris',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))}</small>` : ''}<a href="${escaped(p.opggUrl||opggUrl(p))}" target="_blank" rel="noopener noreferrer" class="index-source">Vérifier ↗</a>` : (report ? `<span class="index-value">${escaped(indexedLabel)}</span><small>Index : ${escaped(report.indexedAge.toLowerCase())}</small><a href="${escaped(report.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="index-source">Source ↗</a>` : `<span class="subtle-dash">Aucune donnée</span>`)}</td>
        <td class="num"><a class="opgg-check" href="${escaped(p.opggUrl || opggUrl(p))}" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir la fiche OP.GG pour actualiser ${escaped(riotId(p))}">Ouvrir ↗</a></td></tr>`;
    }).join('');
  }

  function renderGainers() {
    const players = (data.players || []).filter(p => p.games > 0 && p.lpDelta !== null && Number.isFinite(p.lpDelta)).sort((a,b) => b.lpDelta-a.lpDelta).slice(0,5);
    if (!players.length) { $('gain-list').innerHTML = '<p class="empty-state">Les premiers gains apparaîtront après la synchronisation des parties et des rangs.</p>'; return; }
    const maximum = Math.max(1, ...players.map(p => Math.abs(p.lpDelta)));
    $('gain-list').innerHTML = players.map((p,i) => `<div class="gain-row"><div class="gain-user"><span>${String(i+1).padStart(2,'0')}</span><strong title="${escaped(riotId(p))}">${escaped(p.gameName)}</strong></div><div class="gain-bar"><span style="width:${Math.max(1,Math.abs(p.lpDelta)/maximum*100).toFixed(1)}%;background:${p.lpDelta<0?'linear-gradient(90deg,#964e68,#f27b86)':''}"></span></div><div class="gain-value ${p.lpDelta<0?'negative':''}">${relative(p.lpDelta)}</div></div>`).join('');
  }

  function renderHistory() {
    const snapshots = (history.snapshots || []).filter(s => Array.isArray(s.players) && s.players.length);
    const snapValues = snapshots.filter(s => s.week > 0);
    if (!snapValues.length) { $('history-chart').innerHTML = '<p class="empty-state">Le premier relevé hebdomadaire sera enregistré 7 jours après le départ, puis chaque semaine.</p>'; return; }
    const all = data.players || [];
    const selected = [...all].filter(p => typeof p.lpDelta === 'number').sort((a,b) => b.lpDelta-a.lpDelta).slice(0,5);
    if (!selected.length) return;
    const weeks = [{week:0,players:all.map(p => ({id:p.id,lpDelta:typeof p.baselineScore==='number'?0:null}))},...snapValues];
    const colors = ['#b2f08c','#8ed7f4','#eac091','#d8a9fa','#f08e98'];
    const lines = selected.map((p,i) => ({p,color:colors[i],pts:weeks.map(s => ({x:s.week,y:s.players.find(k => k.id===p.id)?.lpDelta})).filter(q=>q.y!==null&&Number.isFinite(q.y))}));
    const yPoints = lines.flatMap(l=>l.pts.map(p=>p.y));
    if (!yPoints.length) return;
    const lo = Math.min(0,...yPoints),hi=Math.max(0,...yPoints),diff=Math.max(60,hi-lo),min=lo-diff*.12,max=hi+diff*.12;
    const W=540,H=218,pad={left:45,right:9,top:15,bottom:27}; const maxWeek=Math.max(1,...weeks.map(s=>s.week));
    const X=x=>pad.left+(x/maxWeek)*(W-pad.left-pad.right),Y=y=>pad.top+((max-y)/(max-min))*(H-pad.top-pad.bottom);
    const grid=[0,1,2,3,4].map(i=>{const value=min+(max-min)*i/4;const y=Y(value);return `<path d="M${pad.left} ${y}H${W-pad.right}" stroke="#27374b" stroke-dasharray="3 5"/><text x="${pad.left-9}" y="${y+3}" fill="#778ba2" font-size="10" text-anchor="end">${Math.round(value)}</text>`}).join('');
    const weekTicks=weeks.map(s=>`<text x="${X(s.week)}" y="${H-5}" fill="#778ba2" font-size="10" text-anchor="middle">S${s.week}</text>`).join('');
    const plots=lines.map(l=>`<polyline fill="none" stroke="${l.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${l.pts.map(p=>`${X(p.x)},${Y(p.y)}`).join(' ')}"/>${l.pts.map(p=>`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3" fill="${l.color}"/>`).join('')}`).join('');
    $('history-chart').innerHTML=`<svg role="img" aria-label="Évolution hebdomadaire des cinq meilleurs joueurs, en LP" viewBox="0 0 ${W} ${H}">${grid}${weekTicks}${plots}</svg>`;
    $('history-legend').innerHTML=lines.map(l=>`<span><i style="background:${l.color}"></i>${escaped(l.p.gameName)}</span>`).join('');
  }

  function render() { renderStatus();renderStats();renderPodium();renderTable();renderGainers();renderHistory(); }
  $('player-search').addEventListener('input', e => { search=e.target.value.trim().toLocaleLowerCase('fr');renderTable(); });
  $('sort-by').addEventListener('change', e => { sortBy=e.target.value;renderTable(); });
  $('filter-tier').addEventListener('change', e => { tierFilter=e.target.value;renderTable(); });
  async function load() {
    if (window.SOLOQ_PREVIEW_DATA) { data=window.SOLOQ_PREVIEW_DATA.latest;history=window.SOLOQ_PREVIEW_DATA.history;matchResults=window.SOLOQ_PREVIEW_DATA.matches||{matches:[]};prepareMatchStats();render();return; }
    try {
      const r=await fetch('data/latest.json?ts='+Date.now(), {cache:'no-store'});
      if (!r.ok) throw new Error('Impossible de lire les données de classement');
      const payload=await r.json();
      if (!Array.isArray(payload.players)) throw new Error('Format invalide');
      data=payload;
      try {
        const m=await fetch('data/matches.json?ts='+Date.now(),{cache:'no-store'});
        matchResults=m.ok ? await m.json() : {matches:[]};
      } catch (e) {matchResults={matches:[]}; console.warn('Historique des matchs non disponible',e);}
      prepareMatchStats();
      updateOfficialChampionRegistry();
      try {const h=await fetch('data/history.json?ts='+Date.now(),{cache:'no-store'});if(h.ok)history=await h.json();} catch (e) {console.warn('Historique indisponible',e);}
      render();
    } catch(e) {console.error(e);$('sync-indicator').className='sync-light error';$('sync-status').textContent='Impossible de charger les données';$('players-body').innerHTML='<tr><td colspan="10" class="loading-row">Données indisponibles. Lancez un serveur web local ou publiez le site via GitHub Pages.</td></tr>';}
  }
  load();
  /* Les mises à jour de GitHub Pages sont visibles sans recharger la page manuellement. */
  setInterval(load, 5*60*1000);
})();
