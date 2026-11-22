'use client';
import type { CSSProperties } from 'react';

export type Champion = {
  id: string;
  competition: string;
  year: number;
  wonAt: string;
  expiresAt: string;
  confirmed: boolean;
};

export function ChampionBanner({ champion, now }: { champion: Champion | null; now: Date }) {
  if (!champion?.confirmed) return null;
  const start = Date.parse(champion.wonAt);
  const end = Date.parse(champion.expiresAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || now.getTime() < start || now.getTime() >= end) return null;
  return (
    <section className="championBanner" aria-label="Boca campeón">
      <div className="championBannerLights" aria-hidden="true" />
      <div className="championBannerConfetti" aria-hidden="true">
        {Array.from({ length: 28 }, (_, i) => <i key={i} style={{ '--i': i, '--x': ((i * 37 + 11) % 100) + '%', '--d': ((i * 7) % 9) + 's' } as CSSProperties} />)}
      </div>
      <span className="championBannerTrophy" aria-hidden="true">🏆</span>
      <div className="championBannerTitle">¡BOCA CAMPEÓN!</div>
      <div className="championBannerCompetition">{champion.competition.toUpperCase()} {champion.year}</div>
      <div className="championBannerStars" aria-hidden="true">★ ★ ★</div>
    </section>
  );
}
