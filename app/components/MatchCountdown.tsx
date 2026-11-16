// Componente de cuenta regresiva para un partido

import { useState, useEffect } from 'react';
import type { Fixture } from '../types';
import { hasConfirmedKickoff } from '../utils/date';

interface MatchCountdownProps {
  fixture: Fixture;
}

export function MatchCountdown({ fixture }: MatchCountdownProps) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const kickoff = Date.parse(fixture.date);
  const valid = hasConfirmedKickoff(fixture) && Number.isFinite(kickoff);

  useEffect(() => {
    if (!valid) return;

    const tick = () => setRemaining(Math.max(0, Math.ceil((kickoff - Date.now()) / 1000)));
    tick();

    const timer = window.setInterval(() => {
      if (!document.hidden) tick();
    }, 1000);

    document.addEventListener('visibilitychange', tick);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [kickoff, valid]);

  if (!valid) {
    return <span className="countdown">Horario pendiente</span>;
  }

  if (remaining === null) {
    return (
      <span className="countdown countdownTimer" aria-label="Calculando tiempo restante">
        --:--:--
      </span>
    );
  }

  if (remaining === 0) {
    return <span className="countdown">Hora de inicio</span>;
  }

  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    <span
      className="countdown countdownTimer"
      role="timer"
      aria-live="off"
      aria-label={`Faltan ${days} días, ${hours} horas, ${minutes} minutos y ${seconds} segundos`}
    >
      {days > 0 && <span>{days}d </span>}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}
