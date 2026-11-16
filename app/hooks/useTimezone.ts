// Hook para obtener la zona horaria del usuario

import { useState, useEffect } from 'react';

/**
 * Hook para obtener la zona horaria del navegador del usuario.
 */
export function useTimezone(): string {
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimezone(tz);
    } catch {
      // Mantener UTC si falla
    }
  }, []);

  return timezone;
}
