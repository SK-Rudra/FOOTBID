import { BrainCircuit, Shield, Sparkles, Swords } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CatalogManager } from '@/lib/managers-api';

interface ManagerCardProps {
  manager: CatalogManager;
}

function managerInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatMarketValue(value: number): string {
  const millions = value / 1_000_000;

  return `\u20AC${millions.toLocaleString('en-US', {
    maximumFractionDigits: 1,
  })}M`;
}

export function ManagerCard({ manager }: ManagerCardProps) {
  const attributes = [
    ['ATK', manager.attacking],
    ['DEF', manager.defending],
    ['ADP', manager.adaptability],
    ['MAN', manager.manManagement],
  ] as const;

  const bonuses = [
    {
      label: 'Attack',
      value: manager.attackingBonus,
      icon: Swords,
    },
    {
      label: 'Midfield',
      value: manager.midfieldBonus,
      icon: Sparkles,
    },
    {
      label: 'Defence',
      value: manager.defendingBonus,
      icon: Shield,
    },
    {
      label: 'Chemistry',
      value: manager.chemistryBonus,
      icon: BrainCircuit,
    },
  ] as const;

  return (
    <article className="overflow-hidden rounded-[1.4rem] border border-line-strong bg-[#0b121c] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-info/35 hover:shadow-[0_26px_80px_rgba(60,209,255,0.1)]">
      <div className="pitch-grid relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[radial-gradient(circle_at_50%_28%,rgba(60,209,255,0.16),transparent_42%),linear-gradient(160deg,#101c28,#080d14)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-3xl font-black tracking-[-0.06em] text-foreground">
              {manager.overall}
            </p>

            <p className="mt-0.5 text-xs font-black tracking-[0.14em] text-info">MANAGER</p>
          </div>

          <Badge tone="info">{manager.nationalityCode}</Badge>
        </div>

        <div className="my-7 grid place-items-center">
          <div className="relative grid size-28 place-items-center rounded-full border border-info/20 bg-info/[0.06]">
            <BrainCircuit
              aria-hidden="true"
              className="absolute size-20 text-info/[0.08]"
              strokeWidth={1}
            />

            <span className="relative font-mono text-3xl font-black tracking-[-0.08em]">
              {managerInitials(manager.fullName)}
            </span>
          </div>
        </div>

        <div>
          <h2 className="truncate text-xl font-black tracking-[-0.035em] text-foreground">
            {manager.fullName}
          </h2>

          <p className="mt-1 truncate text-xs text-muted">
            {manager.club?.name ?? 'Independent'} / {manager.league?.name ?? 'No league'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone="accent">{manager.tacticalStyle}</Badge>

            {manager.preferredFormations.map((formation) => (
              <Badge key={formation}>{formation}</Badge>
            ))}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-4 gap-2 py-4 text-center">
        {attributes.map(([label, value]) => (
          <div key={label}>
            <dd className="font-mono text-lg font-black text-foreground">{value}</dd>
            <dt className="mt-0.5 text-[0.5625rem] font-bold tracking-[0.1em] text-muted">
              {label}
            </dt>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-2 border-t border-line pt-3">
        {bonuses.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-line bg-black/20 px-3 py-2"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-muted">
              <Icon aria-hidden="true" className="size-3.5 text-info" />
              {label}
            </span>

            <span className="font-mono text-sm font-black text-accent">+{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line px-1 pt-3">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
          Market guide
        </span>

        <span className="font-mono text-sm font-black text-accent">
          {formatMarketValue(manager.marketValue)}
        </span>
      </div>
    </article>
  );
}
