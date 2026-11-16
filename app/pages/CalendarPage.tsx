// Página de calendario de partidos

import { CalendarDays } from 'lucide-react';
import type { Fixture, Snapshot } from '../types';
import { FixtureCard } from '../components/FixtureCard';
import { FINISHED_STATUSES, EXCLUDED_STATUSES } from '../constants/statuses';

interface CalendarPageProps {
  data: Snapshot | null;
  now: Date;
  timeZone: string;
  currentYear: number;
  gameFilter: string;
  onFilterChange: (value: string) => void;
  onAddToCalendar: (fixture: Fixture) => void;
}

export function CalendarPage({
  data,
  now,
  timeZone,
  currentYear,
  gameFilter,
  onFilterChange,
  onAddToCalendar,
}: CalendarPageProps) {
  const games = data?.season === currentYear ? data.fixtures : [];
  const cups = [...new Set(games.map((g) => g.cup))];

  const filteredGames =
    gameFilter === 'Todos' ? games : games.filter((g) => g.cup === gameFilter);

  return (
    <section>
      <div className="heading">
        <h1>Calendario</h1>
      </div>

      <div className="competitionFilters calendarFilters" aria-label="Filtros de calendario">
        <div className="filterScroller" role="group" aria-label="Competición">
          {['Todos', ...cups].map((f) => (
            <button
              className={gameFilter === f ? 'chosen' : ''}
              onClick={() => onFilterChange(f)}
              key={f}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredGames.map((g) => (
        <FixtureCard
          key={g.id}
          fixture={g}
          showCalendarAction
          now={now}
          timeZone={timeZone}
          onAddToCalendar={onAddToCalendar}
        />
      ))}

      {!games.length && (
        <div className="empty panel">
          <CalendarDays size={35} />
          <h2>Aún no hay partidos disponibles</h2>
          <p>
            El calendario aparecerá cuando la API permita consultar {currentYear} y se complete
            una sincronización.
          </p>
        </div>
      )}
    </section>
  );
}
