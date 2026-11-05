// OP.GG dates the profile and its LP chart separately. Use only the latest
// chart entry and only when it agrees with the visible SoloQ rank.
export function rankChartDate(html, rank) {
  const entries = [];
  for (const script of html.matchAll(/<script\b[^>]*>self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g)) {
    let chunk;
    try { chunk = JSON.parse(script[1])[1]; } catch { continue; }
    if (typeof chunk !== 'string') continue;
    for (const chart of chunk.matchAll(/"lpHistories"\s*:\s*(\[[^\]]*\])/g)) {
      try {
        for (const entry of JSON.parse(chart[1])) {
          if (Number.isFinite(Date.parse(entry?.created_at))) entries.push(entry);
        }
      } catch { continue; }
    }
  }
  entries.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const latest = entries[0];
  const info = latest?.tier_info;
  if (!info || info.lp !== rank.lp || info.tier !== rank.tier) return null;
  const division = { IV: 4, III: 3, II: 2, I: 1 }[rank.division];
  if (division && Number(String(info.label).match(/\b([1-4])$/)?.[1]) !== division) return null;
  return latest.created_at;
}
