// Componente de tarjeta de partido

import { MapPin, CalendarDays } from 'lucide-react';
import type { Fixture } from '../types';
import { TeamCrest } from './TeamCrest';
import { getMatchViewState, matchStateLabel } from '../utils/match';
import { matchTime, shortDate, daysUntil } from '../utils/date';
import { EXCLUDED_STATUSES } from '../constants/statuses';

interface FixtureCardProps {
  fixture: Fixture;
  showCalendarAction?: boolean;
  now: Date;
  timeZone: string;
  onAddToCalendar?: (fixture: Fixture) => void;
}

export function FixtureCard({
  fixture,
  showCalendarAction = false,
  now,
  timeZone,
  onAddToCalendar,
}: FixtureCardProps) {
  const state = getMatchViewState(fixture);
  const isFinished = state === 'finished';
  const proximity = !isFinished && hasConfirmedKickoff(fixture) ? daysUntil(fixture, now, timeZone) : '';

  return (
    <article className="game upcomingGame" key={fixture.id}>
      <div className="upcomingHeader">
        <span>
          {fixture.cup}
          {fixture.round ? ' · ' + fixture.round : ''}
        </span>
        <span className={'upcomingStatus' + (['Hoy', 'Mañana'].includes(proximity) ? ' upcomingSoon' : '')}>
          {state === 'scheduled'
            ? ['Hoy', 'Mañana'].includes(proximity)
              ? proximity
              : !hasConfirmedKickoff(fixture)
                ? 'Horario pendiente'
                : Date.parse(fixture.date) < now.getTime()
                  ? 'Esperando actualización'
                  : 'Previa'
            : matchStateLabel(state)}
        </span>
      </div>

      <div className="upcomingBody">
        <div className="upcomingTeams">
          <div>
            <TeamCrest name={fixture.home} id={fixture.homeId} logo={fixture.homeLogo} />
            <strong>{fixture.home}</strong>
            {isFinished && <b className="teamScore">{fixture.homeGoals ?? '–'}</b>}
          </div>
          <div>
            <TeamCrest name={fixture.away} id={fixture.awayId} logo={fixture.awayLogo} />
            <strong>{fixture.away}</strong>
            {isFinished && <b className="teamScore">{fixture.awayGoals ?? '–'}</b>}
          </div>
        </div>

        <div className={'upcomingTime' + (isFinished ? ' resultDate' : '')}>
          <strong>{isFinished ? '' : matchTime(fixture, timeZone)}</strong>
          <span>
            {hasConfirmedKickoff(fixture)
              ? shortDate(fixture, timeZone)
              : 'Fecha pendiente'}
          </span>
        </div>
      </div>

      {fixture.venue && (
        <div className="upcomingVenue">
          <MapPin size={16} />
          <span>{fixture.venue}</span>
          {showCalendarAction && !isFinished && !EXCLUDED_STATUSES.includes(fixture.status as any) && hasConfirmedKickoff(fixture) && (
            <button
              className="iconButton"
              aria-label={'Agregar ' + fixture.home + ' vs. ' + fixture.away + ' al calendario'}
              onClick={() => onAddToCalendar?.(fixture)}
            >
              <CalendarDays size={19} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

// Importar helper necesario
function hasConfirmedKickoff(fixture: { date: string; status: string }): boolean {
  return !['TBD', 'PST'].includes(fixture.status) && Number.isFinite(Date.parse(fixture.date));
}
