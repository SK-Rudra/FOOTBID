import { Shirt } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PlayerCardData {
  name: string;
  position: string;
  overall: number;
  club: string;
  nationality: string;
  priceMillions: number;
  stats: {
    attack: number;
    control: number;
    defense: number;
  };
}

interface PlayerCardProps {
  player: PlayerCardData;
  featured?: boolean;
  className?: string;
}

function playerInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function PlayerCard({ player, featured = false, className }: PlayerCardProps) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-[1.4rem] border bg-[#0b121c] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.34)] transition duration-300 hover:-translate-y-1',
        featured
          ? 'border-accent/35 shadow-[0_24px_80px_rgba(183,243,74,0.1)]'
          : 'border-line-strong hover:border-white/25',
        className,
      )}
      aria-label={`${player.name}, ${player.position}, overall ${player.overall}`}
    >
      <div className="pitch-grid relative aspect-[4/4.8] overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(circle_at_50%_30%,rgba(183,243,74,0.16),transparent_42%),linear-gradient(160deg,#101c28,#080d14)]">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <div>
            <p className="font-mono text-3xl font-black tracking-[-0.06em] text-foreground">
              {player.overall}
            </p>
            <p className="mt-0.5 text-xs font-black tracking-[0.18em] text-accent">
              {player.position}
            </p>
          </div>

          <Badge tone={featured ? 'accent' : 'neutral'}>
            {featured ? 'Featured' : 'Available'}
          </Badge>
        </div>

        <div className="absolute inset-0 grid place-items-center pt-7">
          <div className="relative grid size-30 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-foreground shadow-[0_0_55px_rgba(183,243,74,0.09)] transition duration-300 group-hover:scale-105">
            <Shirt
              aria-hidden="true"
              className="absolute size-20 text-white/[0.055]"
              strokeWidth={1}
            />
            <span className="relative font-mono text-3xl font-black tracking-[-0.08em]">
              {playerInitials(player.name)}
            </span>
          </div>
        </div>

        <div className="absolute right-3 bottom-3 left-3 rounded-xl border border-white/[0.08] bg-black/45 p-3 backdrop-blur-md">
          <h3 className="truncate text-base font-black tracking-[-0.025em] text-foreground">
            {player.name}
          </h3>
          <p className="mt-1 truncate text-xs text-muted">
            {player.club} · {player.nationality}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 py-3 text-center">
        {Object.entries(player.stats).map(([label, value]) => (
          <div key={label}>
            <p className="font-mono text-sm font-black text-foreground">{value}</p>
            <p className="mt-0.5 text-[0.625rem] font-bold uppercase tracking-[0.12em] text-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-line px-1 pt-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Market guide
        </span>
        <span className="font-mono text-sm font-black text-accent">€{player.priceMillions}M</span>
      </div>
    </article>
  );
}
