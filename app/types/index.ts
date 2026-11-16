// Tipos principales del dominio de la aplicación

export type Goal = {
  team: 'home' | 'away';
  player: string;
  minute: string;
  type?: string;       // "Goal", "Goal - Header", "Goal - Penalty", etc.
  assist?: string;     // Jugador que dio la asistencia
};

export type MatchStats = {
  possession?: number | null;      // Porcentaje
  shots?: number | null;
  shotsOnTarget?: number | null;
  corners?: number | null;
  fouls?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
};

export type LineupPlayer = {
  name: string;
  position?: string;
  number?: string;
};

export type Lineup = {
  formation?: string;
  starters: LineupPlayer[];
};

export type Fixture = {
  id: number | string;
  date: string;
  status: string;
  statusLabel: string;
  leagueId: number;
  cup: string;
  round: string;
  home: string;
  away: string;
  homeId: number | string;
  awayId: number | string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  venue: string;
  broadcasts?: string[];
  goals?: Goal[];
  clock?: string;
  stats?: {
    home?: MatchStats;
    away?: MatchStats;
  };
  lineups?: {
    home?: Lineup;
    away?: Lineup;
  };
};

export type Table = {
  name: string;
  rows: {
    rank: number;
    teamId: number;
    name: string;
    points: number | null;
    played: number | null;
    goalDiff: number | null;
  }[];
};

export type Competition = {
  id: number;
  name: string;
  type: string;
  country: string;
  standingsAvailable: boolean;
  tables: Table[];
};

export type Snapshot = {
  schemaVersion: number;
  source: string;
  season: number;
  teamId: number;
  updatedAt: string | null;
  fixtures: Fixture[];
  competitions: Competition[];
};

export type Status = {
  season: number;
  checkedAt: string | null;
  lastSuccessAt: string | null;
  ok: boolean;
  code: string | null;
  message: string;
};

export type MatchViewState =
  | 'scheduled'
  | 'live'
  | 'halftime'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'unknown';

export type CompetitionState =
  | 'En juego'
  | 'Próximamente'
  | 'Finalizada'
  | 'Pendiente'
  | 'Sin confirmar';

export type CompetitionInfo = {
  state: CompetitionState;
  reason: string;
  verified?: string;
  source?: string;
};

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
