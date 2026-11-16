// Componente de navegación lateral

import { Home, CalendarDays, Trophy } from 'lucide-react';
import { Badge } from './Badge';

type TabName = 'Inicio' | 'Calendario' | 'Competiciones';

interface SiteNavigationProps {
  tab: TabName;
  route: (name: string) => string;
  navigate: (name: TabName) => void;
}

export function SiteNavigation({ tab, route, navigate }: SiteNavigationProps) {
  return (
    <aside className="siteNavigation">
      <a className="brand" href={route('Inicio')}>
        <Badge small />
        <span>
          ¿A QUÉ HORA
          <span className="brandSub">JUEGA BOCA?</span>
        </span>
      </a>

      <div className="navLabel">TU LUGAR EN LA TRIBUNA</div>

      <nav aria-label="Navegación principal">
        {[
          { name: 'Inicio' as const, Icon: Home },
          { name: 'Calendario' as const, Icon: CalendarDays },
          { name: 'Competiciones' as const, Icon: Trophy },
        ].map(({ name, Icon }) => (
          <a
            key={name}
            href={route(name)}
            onClick={(e) => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              navigate(name);
            }}
            className={tab === name ? 'active' : ''}
            aria-current={tab === name ? 'page' : undefined}
          >
            <Icon size={19} />
            {name}
          </a>
        ))}
      </nav>
    </aside>
  );
}
