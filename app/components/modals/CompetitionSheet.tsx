// Sheet de detalles de competición

import { X, CalendarDays, Download } from 'lucide-react';
import type { Competition, Fixture } from '../../types';
import { FixtureCard } from '../FixtureCard';
import { getCompetitionInfo, roundLabel } from '../../utils/match';
import { FINISHED_STATUSES, EXCLUDED_STATUSES } from '../../constants/statuses';

interface CompetitionSheetProps {
  competition: Competition;
  fixtures: Fixture[];
  now: Date;
  timeZone: string;
  currentYear: number;
  onClose: () => void;
  onAddToCalendar?: (fixture: Fixture) => void;
}

export function CompetitionSheet({
  competition,
  fixtures,
  now,
  timeZone,
  currentYear,
  onClose,
  onAddToCalendar,
}: CompetitionSheetProps) {
  const competitionFixtures = fixtures
    .filter((g) => g.leagueId === competition.id)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const upcoming = competitionFixtures.filter(
    (g) => !FINISHED_STATUSES.includes(g.status as any) && !EXCLUDED_STATUSES.includes(g.status as any)
  );
  const results = competitionFixtures
    .filter((g) => FINISHED_STATUSES.includes(g.status as any))
    .reverse();

  const rounds = [
    ...new Set(competitionFixtures.map((g) => g.round).filter(Boolean).map(roundLabel)),
  ];

  const info = getCompetitionInfo(competition, fixtures, now, currentYear);

  return (
    <div className="overlay competitionOverlay" onClick={onClose}>
      <section
        className="modal competitionSheet"
        role="dialog"
        aria-modal="true"
        aria-label={competition.name}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheetHandle" aria-hidden="true" />

        <div className="competitionSheetHeader">
          <div>
            <span className="eyebrow gold">{info.state.toUpperCase()}</span>
            <h2>{competition.name}</h2>
          </div>
          <button className="sheetClose" aria-label="Cerrar" autoFocus onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <div className="competitionSheetContent">
          <p className="competitionSheetReason">{info.reason}</p>

          {rounds.length > 0 && (
            <div className="competitionSheetSection">
              <h3>RECORRIDO</h3>
              <div className="competitionRoundPills">
                {rounds.map((round) => (
                  <span key={round}>{round}</span>
                ))}
              </div>
            </div>
          )}

          <div className="competitionSheetSection">
            <h3>POR JUGAR</h3>
            {upcoming.length > 0 ? (
              upcoming.map((g) => (
                <div className="sheetMatch" key={g.id}>
                  <FixtureCard fixture={g} now={now} timeZone={timeZone} />
                  <div className="sheetMatchActions">
                    <button onClick={() => onAddToCalendar?.(g)}>
                      <CalendarDays size={17} /> Google
                    </button>
                    <button>
                      <Download size={17} /> .ics
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="fineprint">No hay próximos partidos registrados.</p>
            )}
          </div>

          <div className="competitionSheetSection">
            <h3>RESULTADOS</h3>
            {results.length > 0 ? (
              results.map((g) => <FixtureCard key={g.id} fixture={g} now={now} timeZone={timeZone} />)
            ) : (
              <p className="fineprint">No hay resultados registrados.</p>
            )}
          </div>

          {competition.tables.length > 0 && (
            <div className="competitionSheetSection">
              <h3>POSICIONES</h3>
              {competition.tables.map((table, index) => (
                <div key={index}>
                  <h3>{table.name}</h3>
                  <div className="tableScroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Pos.</th>
                          <th>Equipo</th>
                          <th>PJ</th>
                          <th>DG</th>
                          <th>Pts.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows
                          .filter(
                            (row, idx) =>
                              idx < 10 ||
                              String(row.teamId) === '5' ||
                              /\bboca\s+juniors\b/i.test(row.name)
                          )
                          .map((row) => (
                            <tr
                              key={row.teamId}
                              className={[
                                row.rank <= 3 ? 'podiumRow podium' + row.rank : '',
                                String(row.teamId) === '5' || /\bboca\s+juniors\b/i.test(row.name)
                                  ? 'bocaRow'
                                  : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                            >
                              <td>{row.rank}</td>
                              <td>{row.name}</td>
                              <td>{row.played ?? '–'}</td>
                              <td>{row.goalDiff ?? '–'}</td>
                              <td>{row.points ?? '–'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {info.source && (
            <p className="fineprint">
              Estado verificado: {info.verified} ·{' '}
              <a href={info.source} target="_blank" rel="noreferrer">
                Consultar fuente
              </a>
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
