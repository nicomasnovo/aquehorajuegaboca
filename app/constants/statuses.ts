// Constantes de estados de partidos

export const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO'] as const;
export const EXCLUDED_STATUSES = ['CANC', 'ABD'] as const;
export const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT'] as const;

export const STATUS_LABELS: Record<string, string> = {
  Scheduled: 'Programado',
  Postponed: 'Postergado',
  Canceled: 'Cancelado',
  Cancelled: 'Cancelado',
  'In Progress': 'En juego',
  Halftime: 'Entretiempo',
  Delayed: 'Demorado',
};

export const MATCH_STATE_LABELS: Record<string, string> = {
  scheduled: 'Previa',
  live: 'En vivo',
  halftime: 'Entretiempo',
  finished: 'Finalizado',
  postponed: 'Postergado',
  cancelled: 'Cancelado',
  unknown: 'Estado sin confirmar',
} as const;
