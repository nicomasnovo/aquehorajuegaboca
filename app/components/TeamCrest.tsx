// Componente para mostrar el escudo de un equipo

import { useState } from 'react';
import { Badge } from './Badge';
import { isBocaTeam } from '../utils/match';

interface TeamCrestProps {
  name: string;
  id: number | string;
  logo?: string | null;
}

export function TeamCrest({ name, id, logo }: TeamCrestProps) {
  const [failed, setFailed] = useState(false);
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

  const isBoca = isBocaTeam(name, id);
  const src = isBoca ? base + '/images/boca.png' : logo;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={'Escudo de ' + name}
        className="teamCrest"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }

  if (isBoca) {
    return <Badge />;
  }

  return <div className="rivalBadge">{name.charAt(0)}</div>;
}
