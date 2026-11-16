// Hook para cargar y gestionar datos de Boca

import { useState, useEffect, useCallback } from 'react';
import type { Snapshot, Status } from '../types';

interface UseBocaDataReturn {
  data: Snapshot | null;
  status: Status | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const FETCH_TIMEOUT = 15000; // 15 segundos

/**
 * Fetch con timeout para evitar colgues.
 */
async function fetchWithTimeout(url: string, timeout: number = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Hook para cargar los datos de Boca desde los JSON estáticos.
 */
export function useBocaData(): UseBocaDataReturn {
  const [data, setData] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

      // Cargar config
      const configRes = await fetchWithTimeout(`${basePath}/data-config.json`);
      if (!configRes.ok) {
        throw new Error('No se pudo leer la configuración de datos.');
      }
      const config = await configRes.json() as { baseUrl?: string };
      const base = (config.baseUrl || `${basePath}/data`).replace(/\/$/, '');

      // Cargar datos en paralelo
      const [dataRes, statusRes] = await Promise.all([
        fetchWithTimeout(`${base}/boca.json`),
        fetchWithTimeout(`${base}/sync-status.json`),
      ]);

      if (!dataRes.ok || !statusRes.ok) {
        throw new Error('No se pudieron cargar los JSON. Se conserva la información ya cargada.');
      }

      const [d, s] = await Promise.all([dataRes.json(), statusRes.json()]) as [Snapshot, Status];

      // Validar esquema básico
      if (
        d.schemaVersion !== 1 ||
        !['API-Football', 'ESPN (API no oficial)'].includes(d.source) ||
        ![5, 451].includes(d.teamId) ||
        !Number.isInteger(d.season) ||
        !Array.isArray(d.fixtures) ||
        !Array.isArray(d.competitions) ||
        typeof s.ok !== 'boolean'
      ) {
        throw new Error('Los JSON recibidos no tienen el formato esperado.');
      }

      setData(d);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, status, loading, error, refresh };
}
