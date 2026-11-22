import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Only competitions with a single-match final. Never infer a title from score alone.
const CUPS = [
  { slug: 'conmebol.sudamericana', name: 'Copa Sudamericana' },
  { slug: 'conmebol.libertadores', name: 'Copa Libertadores' },
  { slug: 'arg.copa', name: 'Copa Argentina' },
];
export function detectChampion(events, cup, now = new Date()) {
  for (const event of events) {
    const match = event.competitions?.[0];
    const competitors = match?.competitors ?? [];
    const boca = competitors.find(c => String(c.team?.id) === '5');
    const round = [match?.type?.text, match?.type?.name, match?.round?.displayName, match?.round?.name, match?.stage?.name, event?.round?.displayName].filter(Boolean).join(' ').toLowerCase();
    const completed = match?.status?.type?.completed === true || event.status?.type?.completed === true;
    const explicitlyWon = boca?.winner === true;
    const finalRound = /(^|\W)final(\W|$)/i.test(round) && !/semi|quarter|cuartos|octavos|round of/i.test(round);
    // Ambiguous two-leg finals must be confirmed separately.
    const legs = /ida|vuelta|first leg|second leg|1st leg|2nd leg/i.test(round + ' ' + (event.name ?? ''));
    if (!boca || competitors.length !== 2 || !completed || !explicitlyWon || !finalRound || legs) continue;
    const date = new Date(event.date);
    if (!Number.isFinite(date.getTime()) || date > now || now.getTime() - date.getTime() > 48 * 3600000) continue;
    const year = Number(event.season?.year) || date.getUTCFullYear();
    return {
      id: cup.slug + '-' + year,
      competition: cup.name,
      year,
      wonAt: date.toISOString(),
      expiresAt: new Date(date.getTime() + 48 * 3600000).toISOString(),
      confirmed: true,
      sourceEvent: String(event.id),
    };
  }
  return null;
}
export async function run({ request = fetch, now = new Date(), file = 'public/data/champion.json' } = {}) {
  let previous = {};
  try { previous = JSON.parse(await readFile(file, 'utf8')); } catch {}
  const month = String(now.getUTCFullYear()) + String(now.getUTCMonth() + 1).padStart(2, '0');
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const months = [String(prev.getUTCFullYear()) + String(prev.getUTCMonth() + 1).padStart(2, '0'), month];
  for (const cup of CUPS) {
    for (const m of months) {
      const response = await request('https://site.api.espn.com/apis/site/v2/sports/soccer/' + cup.slug + '/scoreboard?dates=' + m + '&limit=500', { signal: AbortSignal.timeout(20000) });
      if (!response.ok) continue;
      const data = await response.json();
      const winner = detectChampion(data.events ?? [], cup, now);
      if (!winner) continue;
      if (previous.id === winner.id && previous.confirmed) return previous;
      await writeFile(file, JSON.stringify(winner, null, 2) + '\n');
      return winner;
    }
  }
  return previous;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().then(result => console.log('Champion state:', result.id || 'none')).catch(error => { console.error(error); process.exitCode = 1; });
}
