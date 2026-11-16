// Página de competiciones

import type { Competition, Fixture, Snapshot } from '../types';
import { getCompetitionInfo, roundLabel } from '../utils/match';
import { FINISHED_STATUSES, EXCLUDED_STATUSES } from '../constants/statuses';

interface CompetitionsPageProps {
  data: Snapshot | null;
  now: Date;
  currentYear: number;
  filter: string;
  typeFilter: string;
  onFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onSelectCompetition: (competition: Competition | null) => void;
}

export function CompetitionsPage({
  data,
  now,
  currentYear,
  filter,
  typeFilter,
  onFilterChange,
  onTypeFilterChange,
  onSelectCompetition,
}: CompetitionsPageProps) {
  const games = data?.season === currentYear ? data.fixtures : [];
  const cups = data?.season === currentYear ? data.competitions : [];

  const order = ['En juego', 'Próximamente', 'Pendiente', 'Sin confirmar', 'Finalizada'];

  const visible = cups.filter((c) => {
    const info = getCompetitionInfo(c, games, now, currentYear);
    const matchesFilter = filter === 'Todas' || info.state === filter;
    const matchesType =
      typeFilter === 'Todos los tipos' ||
      (typeFilter === 'Nacionales' ? c.country === 'Argentina' : c.country !== 'Argentina');
    return matchesFilter && matchesType;
  });

  return (
    <section className="competitionsPage">
      <div className="competitionsIntro">
        <span className="eyebrow gold">TEMPORADA {currentYear}</span>
        <h1>COMPETICIONES</h1>
      </div>

      <div className="competitionFilters" aria-label="Filtros de competiciones">
        <div className="filterScroller" role="group" aria-label="Estado">
          {['Todas', 'En juego', 'Próximamente', 'Pendiente', 'Finalizada', 'Sin confirmar'].map(
            (f) => (
              <button
                key={f}
                className={filter === f ? 'chosen' : ''}
                onClick={() => onFilterChange(f)}
              >
                {f}
              </button>
            )
          )}
        </div>
        <div className="filterScroller" role="group" aria-label="Tipo">
          {['Todos los tipos', 'Nacionales', 'Internacionales'].map((f) => (
            <button
              key={f}
              className={typeFilter === f ? 'chosen' : ''}
              onClick={() => onTypeFilterChange(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {order.map((state) => {
        const group = visible.filter(
          (c) => getCompetitionInfo(c, games, now, currentYear).state === state
        );
        if (!group.length) return null;

        return (
          <div className="competitionGroup" key={state}>
            <div className="competitionGroupHeading">
              <span className={'competitionDot ' + (state === 'En juego' ? 'live' : '')} />
              <h2>{state.toUpperCase()}</h2>
            </div>
            <div className="competitionGroupList">
              {group.map((c) => {
                const fixtures = games.filter((g) => g.leagueId === c.id);
                const played = fixtures.filter((g) =>
                  FINISHED_STATUSES.includes(g.status as any)
                ).length;
                const upcoming = fixtures.filter(
                  (g) =>
                    !FINISHED_STATUSES.includes(g.status as any) &&
                    !EXCLUDED_STATUSES.includes(g.status as any)
                ).length;
                const lastRound = fixtures
                  .filter(
                    (g) =>
                      !FINISHED_STATUSES.includes(g.status as any) &&
                      !EXCLUDED_STATUSES.includes(g.status as any)
                  )
                  .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))[0]?.round;
                const category = /amistos/i.test(c.name)
                  ? 'Amistoso'
                  : c.country === 'Argentina'
                    ? 'Nacional'
                    : 'Internacional';

                return (
                  <button
                    type="button"
                    className="competitionListItem"
                    key={c.id}
                    onClick={() => onSelectCompetition(c)}
                  >
                    <div className="competitionListTitle">
                      <strong>{c.name}</strong>
                      <span className="competitionTypeBadge">{category}</span>
                    </div>
                    <p>
                      {played} jugados · {upcoming} por jugar
                      {lastRound ? ' · ' + roundLabel(lastRound) : ''}
                    </p>
                    <span className="competitionChevron" aria-hidden="true">
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="competitionGroupHint">
              {state === 'En juego'
                ? 'Tiene partidos jugados y próximos.'
                : state === 'Finalizada'
                  ? 'No quedan partidos registrados por jugar.'
                  : group[0] && getCompetitionInfo(group[0], games, now, currentYear).reason}
            </p>
          </div>
        );
      })}

      {!visible.length && (
        <div className="empty panel">
          <h2>No hay competiciones con estos filtros</h2>
          <p>Probá con otro estado o tipo.</p>
        </div>
      )}
    </section>
  );
}
