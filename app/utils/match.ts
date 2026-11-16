// Utilidades para manejar estados y lógica de partidos

import type { Fixture, MatchViewState, Competition, CompetitionInfo } from '../types';
import { FINISHED_STATUSES, EXCLUDED_STATUSES, LIVE_STATUSES, STATUS_LABELS, MATCH_STATE_LABELS } from '../constants/statuses';
import { VERIFIED_2026, BOCA_TEAM_IDS } from '../constants/competitions';

/**
 * Verifica si un equipo es Boca Juniors por nombre o ID.
 */
export function isBocaTeam(name: string, id: number | string): boolean {
  return BOCA_TEAM_IDS.includes(String(id) as '5' | '451') || /\bboca\s+juniors\b/i.test(name);
}

/**
 * Obtiene el estado normalizado de un partido.
 */
export function getMatchViewState(fixture: Fixture): MatchViewState {
  const status = fixture.status.toUpperCase();
  const description = fixture.statusLabel.toLowerCase();

  if (FINISHED_STATUSES.includes(status as any) || /full time|finalizado|finished/.test(description)) {
    return 'finished';
  }
  if (EXCLUDED_STATUSES.includes(status as any) || /cancel|abandon|suspend/.test(description)) {
    return 'cancelled';
  }
  if (['PST', 'POSTPONED'].includes(status) || /posterg|postpon|delayed|demorad/.test(description)) {
    return 'postponed';
  }
  if (status === 'HT' || /halftime|entretiempo/.test(description)) {
    return 'halftime';
  }
  if (LIVE_STATUSES.includes(status as any) || /in progress|en juego|live/.test(description)) {
    return 'live';
  }
  if (['NS', 'TBD', 'SCHEDULED'].includes(status) || /programado|scheduled|por confirmar/.test(description)) {
    return 'scheduled';
  }
  return 'unknown';
}

/**
 * Devuelve la etiqueta de estado de un partido.
 */
export function matchStateLabel(state: MatchViewState): string {
  return MATCH_STATE_LABELS[state] || 'Estado sin confirmar';
}

/**
 * Obtiene la etiqueta de estado del fixture.
 */
export function fixtureStatusLabel(fixture: Fixture): string {
  return STATUS_LABELS[fixture.statusLabel] ?? (fixture.status === 'NS' ? 'Programado' : fixture.statusLabel);
}

/**
 * Normaliza el nombre de la ronda.
 */
export function roundLabel(value: string): string {
  const s = value.trim();
  if (!s) return '';

  // Normalizar: quitar acentos, guiones, guiones bajos, y pasar a minúsculas
  const n = s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Detectar torneo (Clausura/Apertura)
  const isClausura = /\bclausura\b/.test(n);
  const isApertura = /\bapertura\b/.test(n);
  const stage = isClausura ? 'Clausura · ' : isApertura ? 'Apertura · ' : '';

  // Fases eliminatorias
  if (/semi.?final|\bsf\b/.test(n)) return 'Semifinal';
  if (/quarter.?final|cuartos|\bqf\b/.test(n)) return 'Cuartos de final';
  if (/round of 16|octavos|\br16\b/.test(n)) return stage + 'Octavos de final';

  // Fase de grupos
  if (/group stage|fase de grupos|group [a-z0-9]|grupo [a-z0-9]/.test(n)) {
    return s
      .replace(/group stage/ig, 'Fase de grupos')
      .replace(/group ([a-z0-9])/ig, 'Grupo $1');
  }

  // Final
  if (/\bfinal\b/.test(n)) return 'Final';

  // Si tiene clausura/apertura pero no coincide con nada más, limpiar el string
  if (isClausura || isApertura) {
    // Remover "clausura" o "apertura" del string y limpiar
    const cleaned = n
      .replace(/\bclausura\b/g, '')
      .replace(/\bapertura\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Si queda "round of 16" u otra fase conocida, traducir
    if (/round of 16/.test(cleaned)) return stage + 'Octavos de final';
    if (/quarter.?final/.test(cleaned)) return stage + 'Cuartos de final';
    if (/semi.?final/.test(cleaned)) return stage + 'Semifinal';
    if (/final/.test(cleaned)) return stage + 'Final';

    // Si no, capitalizar la primera letra de cada palabra
    return (isClausura ? 'Clausura' : 'Apertura') + (cleaned ? ' · ' + capitalize(cleaned) : '');
  }

  // Default: capitalizar
  return capitalize(s);
}

/**
 * Capitaliza la primera letra de cada palabra.
 */
function capitalize(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Determina el estado de una competición.
 */
export function getCompetitionInfo(
  competition: Competition,
  games: Fixture[],
  now: Date,
  season: number
): CompetitionInfo {
  const fixtures = games.filter(g => g.leagueId === competition.id);
  const upcoming = fixtures.filter(
    g => !FINISHED_STATUSES.includes(g.status as any) &&
         !EXCLUDED_STATUSES.includes(g.status as any) &&
         Date.parse(g.date) >= now.getTime() - 86400000
  );
  const last = fixtures
    .filter(g => FINISHED_STATUSES.includes(g.status as any))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];

  // Confirmaciones editoriales expiran después de 30 días
  const verified = season === 2026 ? VERIFIED_2026[competition.id] : undefined;

  if (verified) {
    const verifiedDate = Date.parse(verified.verified! + 'T00:00:00Z');
    const thirtyDaysAgo = now.getTime() - 30 * 86400000;
    const oneDayBefore = verifiedDate - 86400000;

    if (now.getTime() < thirtyDaysAgo && now.getTime() >= oneDayBefore) {
      return verified;
    }
  }

  if (upcoming.length) {
    return { state: 'En juego', reason: 'ESPN registra próximos partidos de Boca en esta competición.' };
  }

  if (last) {
    return {
      state: 'Sin confirmar',
      reason: 'ESPN registra partidos anteriores de Boca, pero no informa próximos encuentros. No se puede determinar si terminó o quedó eliminado.',
    };
  }

  return {
    state: 'Sin confirmar',
    reason: 'No hay partidos de Boca disponibles en ESPN. Esto no confirma que la competición no haya comenzado ni que Boca esté fuera.',
  };
}

/**
 * Verifica si Boca ganó el último partido.
 */
export function didBocaWinLast(lastMatch: Fixture | undefined): boolean {
  if (!lastMatch || lastMatch.homeGoals === null || lastMatch.awayGoals === null) {
    return false;
  }

  const bocaHome = isBocaTeam(lastMatch.home, lastMatch.homeId);
  const diff = bocaHome
    ? lastMatch.homeGoals - lastMatch.awayGoals
    : lastMatch.awayGoals - lastMatch.homeGoals;

  return diff > 0;
}
