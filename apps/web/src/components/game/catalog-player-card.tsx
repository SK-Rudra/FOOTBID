import { ArrowUpRight, Shirt } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { CatalogPlayer } from '@/lib/players-api';

interface CatalogPlayerCardProps {
  player: CatalogPlayer;
}

function playerInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function formatMarketValue(value: number): string {
  const millions = value / 1_000_000;

  return `€${millions.toLocaleString('en', {
    maximumFractionDigits: 1,
  })}M`;
}

export function CatalogPlayerCard({ player }: CatalogPlayerCardProps) {
  const attributes = [
    ['PAC', player.pace],
    ['SHO', player.shooting],
    ['PAS', player.passing],
    ['DRI', player.dribbling],
    ['DEF', player.defending],
    ['PHY', player.physical],
  ] as const;

  return (
    <Link
      href={`/players/${player.id}`}
      className="group block rounded-[1.4rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`View ${player.fullName}, ${player.primaryPosition}, overall ${player.overall}`}
    >
      <article className="overflow-hidden rounded-[1.4rem] border border-line-strong bg-[#0b121c] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition duration-300 group-hover:-translate-y-1 group-hover:border-accent/35 group-hover:shadow-[0_26px_80px_rgba(183,243,74,0.1)]">
        <div className="pitch-grid relative aspect-[4/4.35] overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(circle_at_50%_30%,rgba(183,243,74,0.15),transparent_43%),linear-gradient(160deg,#101c28,#080d14)]">
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
            <div>
              <p className="font-mono text-3xl font-black tracking-[-0.06em] text-foreground">
                {player.overall}
              </p>

              <p className="mt-0.5 text-xs font-black tracking-[0.18em] text-accent">
                {player.primaryPosition}
              </p>
            </div>

            <Badge>{player.nationalityCode}</Badge>
          </div>

          <div className="absolute inset-0 grid place-items-center pt-8">
            <div className="relative grid size-28 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-foreground shadow-[0_0_55px_rgba(183,243,74,0.08)] transition duration-300 group-hover:scale-105">
              <Shirt
                aria-hidden="true"
                className="absolute size-19 text-white/[0.055]"
                strokeWidth={1}
              />

              <span className="relative font-mono text-3xl font-black tracking-[-0.08em]">
                {playerInitials(player.fullName)}
              </span>
            </div>
          </div>

          <div className="absolute right-3 bottom-3 left-3 rounded-xl border border-white/[0.08] bg-black/50 p-3 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black tracking-[-0.025em] text-foreground">
                  {player.fullName}
                </h2>

                <p className="mt-1 truncate text-xs text-muted">
                  {player.club?.name ?? 'Independent'} · {player.league?.name ?? 'No league'}
                </p>
              </div>

              <ArrowUpRight
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted transition group-hover:text-accent"
              />
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-6 gap-1 py-3 text-center">
          {attributes.map(([label, value]) => (
            <div key={label}>
              <dd className="font-mono text-sm font-black text-foreground">{value}</dd>
              <dt className="mt-0.5 text-[0.5625rem] font-bold tracking-[0.1em] text-muted">
                {label}
              </dt>
            </div>
          ))}
        </dl>

        <div className="flex items-center justify-between border-t border-line px-1 pt-3">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
            Market guide
          </span>

          <span className="font-mono text-sm font-black text-accent">
            {formatMarketValue(player.marketValue)}
          </span>
        </div>
      </article>
    </Link>
  );
}
