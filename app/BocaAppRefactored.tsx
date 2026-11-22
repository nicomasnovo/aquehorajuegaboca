'use client';

/**
 * Componente principal de la aplicación ¿A qué hora juega Boca?
 *
 * Este componente coordina la navegación entre las diferentes vistas
 * y gestiona el estado global de la aplicación.
 */
import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { ChampionBanner, type Champion } from './components/ChampionBanner';
import type { CSSProperties } from 'react';
import type { Fixture, Competition, Snapshot, Status } from './types';
import { useBocaData } from './hooks/useBocaData';
import { useTimezone } from './hooks/useTimezone';
import { useClock } from './hooks/useClock';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { SiteNavigation } from './components/SiteNavigation';
import { HomePage } from './pages/HomePage';
import { CalendarPage } from './pages/CalendarPage';
import { CompetitionsPage } from './pages/CompetitionsPage';
import { CalendarModal } from './components/modals/CalendarModal';
import { InstallModal } from './components/modals/InstallModal';
import { CompetitionSheet } from './components/modals/CompetitionSheet';
import { getCurrentYear, formatUpdated } from './utils/date';

type TabName = 'Inicio' | 'Calendario' | 'Competiciones';

interface BocaAppProps {
  tab?: TabName;
}

export default function BocaApp({ tab = 'Inicio' }: BocaAppProps) {
  // Estado de navegación
  const [activeTab, setActiveTab] = useState<TabName>(tab);
  const [calendarGame, setCalendarGame] = useState<Fixture | null>(null);
  const [selectedCompetition, setSelectedCompetition] =
    useState<Competition | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [champion, setChampion] = useState<Champion | null>(null);
  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_BASE_PATH || '') + '/data/champion.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(setChampion)
      .catch(() => setChampion(null));
  }, []);

  // Estado de filtros
  const [filter, setFilter] = useState('Todas');
  const [typeFilter, setTypeFilter] = useState('Todos los tipos');
  const [gameFilter, setGameFilter] = useState('Todos');

  // Datos
  const { data, status, loading, error } = useBocaData();
  const timeZone = useTimezone();
  const now = useClock(30000);
  const { isStandalone, deferredInstall, requestInstall } = useInstallPrompt();

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const currentYear = getCurrentYear('America/Argentina/Buenos_Aires');

  // Rutas
  const route = (name: string): string =>
    basePath +
    (name === 'Inicio'
      ? '/'
      : name === 'Calendario'
        ? '/calendario'
        : '/competiciones');

  // Navegación
  const navigate = (name: TabName) => {
    if (name === activeTab) return;
    window.history.pushState(null, '', route(name));
    setActiveTab(name);
    setSelectedCompetition(null);
    setCalendarGame(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Actualización de query params
  const updateQuery = (changes: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.pushState(null, '', url.pathname + url.search + url.hash);
  };

  // Handlers de filtros
  const handleFilterChange = (value: string) => {
    setFilter(value);
    updateQuery({ estado: value === 'Todas' ? null : value });
  };

  const handleTypeFilterChange = (value: string) => {
    setTypeFilter(value);
    updateQuery({ tipo: value === 'Todos los tipos' ? null : value });
  };

  const handleGameFilterChange = (value: string) => {
    setGameFilter(value);
    updateQuery({ torneo: value === 'Todos' ? null : value });
  };

  // Restaurar estado desde URL
  useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      setFilter(params.get('estado') || 'Todas');
      setTypeFilter(params.get('tipo') || 'Todos los tipos');
      setGameFilter(params.get('torneo') || 'Todos');

      const id = params.get('competicion');
      setSelectedCompetition(
        id && /^\d+$/.test(id)
          ? (data?.competitions.find((c) => c.id === Number(id)) ?? null)
          : null,
      );
    };

    const onPop = () => {
      const path = window.location.pathname.replace(/\/$/, '');
      setActiveTab(
        path.endsWith('/calendario')
          ? 'Calendario'
          : path.endsWith('/competiciones')
            ? 'Competiciones'
            : 'Inicio',
      );
      restore();
    };

    onPop();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [data]);

  // Cerrar modales con Escape
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedCompetition(null);
        setShowInstallModal(false);
        setCalendarGame(null);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  // Handler de instalación
  const handleInstall = async () => {
    const outcome = await requestInstall();
    if (outcome === 'accepted') {
      setShowInstallModal(false);
    }
  };

  // Confetti de fondo
  const confetti = Array.from({ length: 24 }, (_, i) => ({
    key: i,
    style: {
      '--i': i,
      '--x': ((i * 37 + 11) % 97) + '%',
      '--delay': -((i * 13) % 31) + 's',
      '--duration': 16 + ((i * 7) % 15) + 's',
    } as CSSProperties,
  }));

  return (
    <>
      {/* Confetti de fondo */}
      <div className="stadiumConfetti" aria-hidden="true">
        {confetti.map((c) => (
          <span key={c.key} style={c.style} />
        ))}
      </div>

      {/* Skip link para accesibilidad */}
      <a className="skipLink" href="#contenido-principal">
        Saltar al contenido
      </a>

      {/* Navegación */}
      <SiteNavigation tab={activeTab} route={route} navigate={navigate} />

      {/* Watermark */}
      <div className="pageCrestWatermark" aria-hidden="true">
        <img src={basePath + '/images/boca.png'} alt="" />
      </div>

      {/* Contenido principal */}
      <main
        id="contenido-principal"
        className={activeTab === 'Inicio' ? 'homePage' : undefined}
      >
        {activeTab === 'Inicio' && <ChampionBanner champion={champion} now={now} />}
        {activeTab === 'Inicio' && (
          <HomePage
            data={data}
            status={status}
            now={now}
            timeZone={timeZone}
            currentYear={currentYear}
            error={error}
            onNavigate={navigate}
            route={route}
            onAddToCalendar={setCalendarGame}
          />
        )}

        {activeTab === 'Calendario' && (
          <CalendarPage
            data={data}
            now={now}
            timeZone={timeZone}
            currentYear={currentYear}
            gameFilter={gameFilter}
            onFilterChange={handleGameFilterChange}
            onAddToCalendar={setCalendarGame}
          />
        )}

        {activeTab === 'Competiciones' && (
          <CompetitionsPage
            data={data}
            now={now}
            currentYear={currentYear}
            filter={filter}
            typeFilter={typeFilter}
            onFilterChange={handleFilterChange}
            onTypeFilterChange={handleTypeFilterChange}
            onSelectCompetition={setSelectedCompetition}
          />
        )}

        {/* Footer de instalación PWA */}
        {!isStandalone && (
          <div className="installFooter">
            <div>
              <strong>¿A qué hora juega Boca?</strong>
              <p>Tené los próximos partidos a un toque.</p>
            </div>
            <button onClick={() => void handleInstall()}>
              <Download size={17} /> Instalar app
            </button>
          </div>
        )}

        {/* Footer principal */}
        <footer>
          <p>¿A QUÉ HORA JUEGA BOCA?</p>
          <p className="fineprint">
            Última carga válida:{' '}
            {formatUpdated(data?.updatedAt ?? null, timeZone)}
          </p>
          <p>
            <span className="dot" /> Azul y oro. Todos los días.
          </p>
          <p>Proyecto independiente hecho por hinchas para hinchas</p>
        </footer>
      </main>

      {/* Modales */}
      {calendarGame && (
        <CalendarModal
          fixture={calendarGame}
          onClose={() => setCalendarGame(null)}
        />
      )}

      {showInstallModal && (
        <InstallModal onClose={() => setShowInstallModal(false)} />
      )}

      {selectedCompetition && data && (
        <CompetitionSheet
          competition={selectedCompetition}
          fixtures={data.fixtures}
          now={now}
          timeZone={timeZone}
          currentYear={currentYear}
          onClose={() => setSelectedCompetition(null)}
          onAddToCalendar={setCalendarGame}
        />
      )}
    </>
  );
}
