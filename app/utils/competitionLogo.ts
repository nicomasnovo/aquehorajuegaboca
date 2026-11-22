// Logos oficiales de competiciones publicados por ESPN (variante para fondos oscuros).
const ESPN_LOGO_BASE = 'https://a.espncdn.com/i/leaguelogos/soccer/500-dark/';
const LOGO_IDS: Array<[RegExp, string]> = [
  [/sudamericana/i, '1208'],
  [/libertadores/i, '58'],
  [/recopa/i, '2335'],
  [/copa argentina/i, '2320'],
  [/liga argentina|liga profesional|primera divisi[oó]n|torneo apertura|torneo clausura/i, '1'],
];

export function competitionLogo(name: string): string | null {
  const match = LOGO_IDS.find(([pattern]) => pattern.test(name));
  return match ? `${ESPN_LOGO_BASE}${match[1]}.png` : null;
}
