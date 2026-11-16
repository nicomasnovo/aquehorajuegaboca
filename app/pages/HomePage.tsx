// Página de inicio con próximo partido y último resultado

import { ArrowUpRight, Info, MapPin, CalendarDays } from 'lucide-react';
import type { Fixture, Snapshot, Status } from '../types';
import { Badge } from '../components/Badge';
import { TeamCrest } from '../components/TeamCrest';
import { MatchCountdown } from '../components/MatchCountdown';
import { FixtureCard } from '../components/FixtureCard';
import {
  getMatchViewState,
  matchStateLabel,
  isBocaTeam,
  didBocaWinLast,
} from '../utils/match';
import {
  matchTime,
  fullDate,
  heroDate,
  isToday,
  isInLiveWindow,
} from '../utils/date';
import { matchMood } from '../utils/mood';
import { FINISHED_STATUSES, EXCLUDED_STATUSES } from '../constants/statuses';

interface HomePageProps {
  data: Snapshot | null;
  status: Status | null;
  now: Date;
  timeZone: string;
  currentYear: number;
  error: string;
  onNavigate: (tab: 'Inicio' | 'Calendario' | 'Competiciones') => void;
  route: (name: string) => string;
  onAddToCalendar: (fixture: Fixture) => void;
}

export function HomePage({
  data,
  status,
  now,
  timeZone,
  currentYear,
  error,
  onNavigate,
  route,
  onAddToCalendar,
}: HomePageProps) {
  const games = data?.season === currentYear ? data.fixtures : [];

  // Filtrar partidos próximos
  const upcoming = games.filter((g) => {
    const state = getMatchViewState(g);
    return (
      state === 'live' ||
      state === 'halftime' ||
      (state === 'scheduled' &&
        Date.parse(g.date) >= now.getTime() - 3 * 3600000)
    );
  });
  upcoming.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const activeMatch = upcoming.find((g) =>
    ['live', 'halftime'].includes(getMatchViewState(g)),
  );
  const next = activeMatch ?? upcoming[0];

  const lastMatch = games
    .filter((g) => getMatchViewState(g) === 'finished')
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0];

  const lastMatchBocaWon = didBocaWinLast(lastMatch);
  const showLive =
    next && ['live', 'halftime'].includes(getMatchViewState(next));
  const mood = matchMood(next, lastMatch, now);

  return (
    <>
      {(error ||
        (status && !status.ok) ||
        (data && data.season !== currentYear)) && (
        <div className="notice" role="status">
          <Info size={16} />
          <span>
            {error ||
              (!status?.ok
                ? status?.message
                : 'Los datos no corresponden a la temporada actual.')}
          </span>
        </div>
      )}

      {next ? (
        <section className="hero newHero">
          <div className="heroTop">
            <span className="heroEyebrow">
              {showLive ? 'PARTIDO EN VIVO' : 'PRÓXIMO PARTIDO'}{' '}
              <span className={'matchStateTag ' + getMatchViewState(next)}>
                {getMatchViewState(next) === 'scheduled' &&
                Date.parse(next.date) < now.getTime()
                  ? 'Sin confirmar'
                  : matchStateLabel(getMatchViewState(next))}
              </span>
            </span>
            {getMatchViewState(next) === 'scheduled' &&
            Date.parse(next.date) >= now.getTime() ? (
              <MatchCountdown fixture={next} />
            ) : (
              <span className="countdown">
                {getMatchViewState(next) === 'scheduled'
                  ? 'Esperando actualización'
                  : matchStateLabel(getMatchViewState(next))}
              </span>
            )}
          </div>

          <div className="heroCompetition">
            <strong>{next.cup}</strong>
            {next.round && <span> · {next.round}</span>}
          </div>

          <div className="match">
            <div className="club">
              <TeamCrest
                name={next.home}
                id={next.homeId}
                logo={next.homeLogo}
              />
              <h2>{next.home}</h2>
              <span>LOCAL</span>
            </div>
            <div className="versus">
              {/* Badge EN VIVO si está dentro de los 90 minutos */}
              {isInLiveWindow(next, now) && !showLive && (
                <span className="liveWindowBadge">
                  <span className="liveDot" /> EN VIVO
                </span>
              )}
              {/* Badge HOY si el partido es hoy */}
              {isToday(next, now, timeZone) &&
                !isInLiveWindow(next, now) &&
                !showLive && <div className="todayBadge">HOY</div>}
              <strong className="heroKickoff">
                {showLive && next.homeGoals !== null && next.awayGoals !== null
                  ? next.homeGoals + ' – ' + next.awayGoals
                  : matchTime(next, timeZone)}
              </strong>
              <div className="heroFullDate">
                {showLive && next.clock
                  ? 'Minuto ' + next.clock
                  : heroDate(next, timeZone)}
              </div>
              <span className="heroLabel">
                {showLive ? 'MARCADOR' : 'HORA LOCAL'}
              </span>
            </div>
            <div className="club">
              <TeamCrest
                name={next.away}
                id={next.awayId}
                logo={next.awayLogo}
              />
              <h2>{next.away}</h2>
              <span>VISITANTE</span>
            </div>
          </div>

          {showLive && next.goals && next.goals.length > 0 && (
            <div className="matchGoals">
              {next.goals.map((goal, i) => (
                <span key={i}>
                  {goal.player}
                  {goal.minute ? ` · ${goal.minute}'` : ''}
                  {goal.type && goal.type !== 'Goal' && (
                    <em
                      style={{ opacity: 0.7, marginLeft: 4 }}
                      title={goal.type}
                    >
                      {goal.type.includes('Header')
                        ? '(cabezazo)'
                        : goal.type.includes('Penalty')
                          ? '(penal)'
                          : ''}
                    </em>
                  )}
                  {goal.assist && (
                    <em style={{ opacity: 0.6, marginLeft: 4 }}>
                      asist. {goal.assist}
                    </em>
                  )}
                  {' ('}
                  {goal.team === 'home' ? next.home : next.away})
                </span>
              ))}
            </div>
          )}

          <div className="heroBottom">
            <div className="heroVenue">
              <MapPin size={16} /> {next.venue}
            </div>
            <div className="heroBroadcast">
              <strong>TRANSMISIÓN</strong>
              <span>
                {next.broadcasts?.length
                  ? next.broadcasts.join(' · ')
                  : 'Canales por confirmar'}
              </span>
            </div>
            {!showLive && hasConfirmedKickoff(next) && (
              <div className="heroActions">
                <button onClick={() => onAddToCalendar(next)}>
                  <CalendarDays size={17} /> Agendar partido
                </button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="hero empty">
          <Badge />
          <h2>
            {data?.updatedAt
              ? 'Sin próximos partidos informados'
              : 'Esperando los datos de Boca'}
          </h2>
          <p>
            {data?.updatedAt
              ? 'La API no informa próximos partidos en esta carga.'
              : 'Todavía no hay una respuesta válida para la temporada actual.'}
          </p>
          <span className="pill">TEMPORADA {currentYear}</span>
        </section>
      )}

      {/* TribunaStreamers disponible en components/TribunaStreamers.tsx */}

      <p className="matchMood" aria-label="Frase de la fecha">
        {mood}
      </p>

      <div className="cabj-divider"></div>

      <div className="dashboard">
        {lastMatch && (
          <section className="lastMatchSection">
            <div className="sectionTitle">
              <h2>ÚLTIMO PARTIDO</h2>
              <span className="lastMatchState">Finalizado</span>
            </div>
            <div
              className={
                'lastMatchPanel' + (lastMatchBocaWon ? ' lastMatchWin' : '')
              }
            >
              <div className="lastMatchCompetition">
                {lastMatch.cup}
                {lastMatch.round ? ' · ' + lastMatch.round : ''}
              </div>
              <div className="lastMatchScore">
                <div>
                  <TeamCrest
                    name={lastMatch.home}
                    id={lastMatch.homeId}
                    logo={lastMatch.homeLogo}
                  />
                  <span>{lastMatch.home}</span>
                </div>
                <strong>
                  {lastMatch.homeGoals ?? '–'} – {lastMatch.awayGoals ?? '–'}
                </strong>
                <div>
                  <TeamCrest
                    name={lastMatch.away}
                    id={lastMatch.awayId}
                    logo={lastMatch.awayLogo}
                  />
                  <span>{lastMatch.away}</span>
                </div>
              </div>
              {lastMatch.goals && lastMatch.goals.length > 0 && (
                <div className="matchGoals">
                  {lastMatch.goals.map((goal, i) => (
                    <span key={i}>
                      {goal.player}
                      {goal.minute ? ` · ${goal.minute}'` : ''}
                      {goal.type && goal.type !== 'Goal' && (
                        <em
                          style={{ opacity: 0.7, marginLeft: 4 }}
                          title={goal.type}
                        >
                          {goal.type.includes('Header')
                            ? '(cabezazo)'
                            : goal.type.includes('Penalty')
                              ? '(penal)'
                              : ''}
                        </em>
                      )}
                      {goal.assist && (
                        <em style={{ opacity: 0.6, marginLeft: 4 }}>
                          asist. {goal.assist}
                        </em>
                      )}
                      {' ('}
                      {goal.team === 'home' ? lastMatch.home : lastMatch.away})
                    </span>
                  ))}
                </div>
              )}
              <p className="fineprint">
                {fullDate(lastMatch, timeZone)} · {lastMatch.venue}
              </p>
            </div>
          </section>
        )}

        <section>
          <div className="sectionTitle">
            <h2>LO QUE VIENE</h2>
            <a
              href={route('Calendario')}
              onClick={(e) => {
                if (
                  e.button !== 0 ||
                  e.metaKey ||
                  e.ctrlKey ||
                  e.shiftKey ||
                  e.altKey
                )
                  return;
                e.preventDefault();
                onNavigate('Calendario');
              }}
            >
              Calendario <ArrowUpRight size={17} />
            </a>
          </div>
          {upcoming.slice(1, 4).map((g) => (
            <FixtureCard key={g.id} fixture={g} now={now} timeZone={timeZone} />
          ))}
          {upcoming.length < 2 && (
            <p className="fineprint">No hay más encuentros cargados.</p>
          )}
        </section>
      </div>
    </>
  );
}

function hasConfirmedKickoff(fixture: {
  date: string;
  status: string;
}): boolean {
  return (
    !['TBD', 'PST'].includes(fixture.status) &&
    Number.isFinite(Date.parse(fixture.date))
  );
}
