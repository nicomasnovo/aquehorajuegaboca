// Datos de competiciones verificados editorialmente

import type { CompetitionInfo } from '../types';

// Confirmaciones editoriales para la temporada 2026
// Expiran después de 30 días - no llevar a temporadas siguientes
export const VERIFIED_2026: Record<number, CompetitionInfo> = {
  1001: {
    state: 'En juego',
    reason: 'Boca disputa los playoffs del Torneo Clausura 2026.',
    verified: '2026-11-15',
    source: 'https://deportv.gob.ar/futbol/agenda-boca-partidos-confirmados-dias-horarios-tv-nid%3A18915',
  },
  1002: {
    state: 'En juego',
    reason: 'Boca está clasificado a la final de la Copa Argentina 2026.',
    verified: '2026-11-15',
    source: 'https://deportv.gob.ar/futbol/agenda-boca-partidos-confirmados-dias-horarios-tv-nid%3A18915',
  },
  1003: {
    state: 'Finalizada',
    reason: 'Boca disputó la fase de grupos de la Libertadores 2026 y continuó en la Sudamericana.',
    verified: '2026-11-15',
    source: 'https://gol.conmebol.com/sudamericana/en/news/boca-juniors-en-la-conmebol-sudamericana-2026-resultados-plantel-y-calendario',
  },
  1004: {
    state: 'En juego',
    reason: 'Boca está clasificado a la final de la Sudamericana 2026.',
    verified: '2026-11-15',
    source: 'https://deportv.gob.ar/futbol/agenda-boca-partidos-confirmados-dias-horarios-tv-nid%3A18915',
  },
  1006: {
    state: 'Pendiente',
    reason: 'La participación de Boca depende de ganar el Torneo Clausura 2026.',
    verified: '2026-11-15',
    source: 'https://tn.com.ar/deportes/futbol/2026/11/15/boca-se-clasifico-a-la-final-de-la-copa-argentina-y-va-por-cuatro-titulos-mas-el-exigente-calendario-que-le-espera/',
  },
  1009: {
    state: 'Pendiente',
    reason: 'Boca solo podría acceder a una próxima edición si gana la Sudamericana.',
    verified: '2026-11-15',
    source: 'https://tn.com.ar/deportes/futbol/2026/11/15/boca-se-clasifico-a-la-final-de-la-copa-argentina-y-va-por-cuatro-titulos-mas-el-exigente-calendario-que-le-espera/',
  },
};

// IDs de Boca Juniors en diferentes proveedores
export const BOCA_TEAM_IDS = ['5', '451'] as const;

// Nombre canónico del equipo
export const BOCA_TEAM_NAME = 'Boca Juniors';
