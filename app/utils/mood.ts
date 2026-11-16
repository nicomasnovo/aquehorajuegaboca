// Utilidades para determinar el estado de ánimo según el contexto

import type { Fixture } from '../types';
import { MOOD_LINES, type MoodCategory } from '../constants/mood-lines';
import { getMatchViewState, isBocaTeam } from './match';
import { hasConfirmedKickoff } from './date';

/**
 * Determina la frase de estado de ánimo según el contexto del partido.
 */
export function matchMood(
  next: Fixture | undefined,
  last: Fixture | undefined,
  now: Date
): string {
  let category: MoodCategory = 'empty';
  let fixture = next ?? last;

  if (next) {
    const state = getMatchViewState(next);

    if (state === 'live' || state === 'halftime') {
      category = 'live';
    } else if (/\briver\b/i.test(next.home + ' ' + next.away)) {
      category = 'superclasico';
    } else if (
      hasConfirmedKickoff(next) &&
      Date.parse(next.date) - now.getTime() <= 3600000 &&
      Date.parse(next.date) >= now.getTime()
    ) {
      category = 'soon';
    } else if (hasConfirmedKickoff(next) && isToday(next.date, now)) {
      category = 'today';
    } else {
      category = 'upcoming';
    }
  } else if (last && last.homeGoals !== null && last.awayGoals !== null) {
    const bocaHome = isBocaTeam(last.home, last.homeId);
    const diff = bocaHome
      ? last.homeGoals - last.awayGoals
      : last.awayGoals - last.homeGoals;
    category = diff > 0 ? 'winning' : diff < 0 ? 'losing' : 'draw';
  }

  const lines = MOOD_LINES[category];
  const seed = String(fixture?.id ?? 'empty').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0);
  return lines[seed % lines.length];
}

/**
 * Verifica si una fecha es hoy en la zona horaria local.
 */
function isToday(dateStr: string, now: Date): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return formatter.format(new Date(dateStr)) === formatter.format(now);
}
