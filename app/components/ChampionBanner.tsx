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
      <div className="championBannerSweep" aria-hidden="true" />
      <div className="championBannerRays" aria-hidden="true" />
      <div className="championBannerFireworks" aria-hidden="true">
        {Array.from({ length: 5 }, (_, burst) => (
          <div key={burst} className="championFirework" style={{ '--fx': `${[17, 80, 50, 29, 71][burst]}%`, '--fy': `${[30, 26, 17, 70, 67][burst]}%`, '--delay': `${[0, 1.1, 2.1, 3.2, 4.4][burst]}s` } as CSSProperties}>
            {Array.from({ length: 16 }, (_, ray) => <i key={ray} style={{ '--angle': `${ray * 22.5}deg`, '--distance': `${[38, 48, 43, 54, 42][burst]}px` } as CSSProperties} />)}
          </div>
        ))}
      </div>
      <div className="championBannerConfetti" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--i': i, '--x': ((i * 37 + 11) % 100) + '%', '--d': ((i * 7) % 9) + 's' } as CSSProperties} />)}
      </div>
      <div className="championBannerEmblem" aria-hidden="true"><span className="championBannerTrophy">🏆</span></div>
      <div className="championBannerTitle">¡BOCA CAMPEÓN!</div>
      <div className="championBannerCompetition"><span>{champion.competition.toUpperCase()} {champion.year}</span></div>
      <div className="championBannerBottomStripe" aria-hidden="true" />
    </section>
  );
}
