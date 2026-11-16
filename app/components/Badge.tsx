// Componente del escudo de Boca Juniors

interface BadgeProps {
  small?: boolean;
}

export function Badge({ small = false }: BadgeProps) {
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return (
    <img
      className={'badge ' + (small ? 'small' : '')}
      src={base + '/images/boca.png'}
      alt="Escudo de Boca Juniors"
      decoding="async"
    />
  );
}
