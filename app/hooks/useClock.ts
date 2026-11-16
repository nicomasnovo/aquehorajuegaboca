// Hook para actualizar periódicamente la hora actual

import { useState, useEffect } from 'react';

/**
 * Hook que actualiza la fecha actual periódicamente.
 * @param intervalMs - Intervalo de actualización en ms (default 30000)
 */
export function useClock(intervalMs: number = 30000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());

    const timer = window.setInterval(() => {
      if (!document.hidden) tick();
    }, intervalMs);

    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);

  return now;
}
