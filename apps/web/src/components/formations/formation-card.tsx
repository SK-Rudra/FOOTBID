import { Activity, BrainCircuit, Shield, Sparkles, Swords } from 'lucide-react';
import { FormationPitch } from '@/components/formations/formation-pitch';
import { Badge } from '@/components/ui/badge';
import type { CatalogFormation } from '@/lib/formations-api';

interface FormationCardProps {
  formation: CatalogFormation;
}

export function formatFormationMarketValue(value: number): string {
  const millions = value / 1_000_000;

  return `\u20AC${millions.toLocaleString('en-US', {
    maximumFractionDigits: 1,
  })}M`;
}

export function FormationCard({ formation }: FormationCardProps) {
  const intensity = [
    ['WID', formation.width],
    ['TEM', formation.tempo],
    ['PRS', formation.pressingIntensity],
  ] as const;

  const bonuses = [
    {
      label: 'Attack',
      value: formation.attackingBonus,
      icon: Swords,
    },
    {
      label: 'Midfield',
      value: formation.midfieldBonus,
      icon: Sparkles,
    },
    {
      label: 'Defence',
      value: formation.defendingBonus,
      icon: Shield,
    },
    {
      label: 'Chemistry',
      value: formation.chemistryBonus,
      icon: BrainCircuit,
    },
  ] as const;

  return (
    <article className="overflow-hidden rounded-[1.4rem] border border-line-strong bg-[#0b121c] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_26px_80px_rgba(183,243,74,0.1)]">
      <FormationPitch formation={formation} />

      <div className="px-1 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black tracking-[-0.035em] text-foreground">
              {formation.name}
            </h2>

            <p className="mt-1 font-mono text-xs font-bold text-accent">{formation.code}</p>
          </div>

          <Badge tone={formation.isNeutral ? 'info' : 'accent'}>
            {formation.isNeutral ? 'Shared fallback' : formation.tier}
          </Badge>
        </div>

        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {formation.description ?? 'Balanced tactical formation.'}
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge>{formation.buildUpStyle}</Badge>
          <Badge>{formation.attackingStyle}</Badge>
          <Badge>{formation.defensiveStyle}</Badge>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3 text-center">
        {intensity.map(([label, value]) => (
          <div key={label}>
            <dd className="font-mono text-lg font-black text-foreground">{value}</dd>
            <dt className="mt-0.5 text-[0.5625rem] font-bold tracking-[0.1em] text-muted">
              {label}
            </dt>
          </div>
        ))}
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {bonuses.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-line bg-black/20 px-3 py-2"
          >
            <span className="flex items-center gap-2 text-xs font-bold text-muted">
              <Icon aria-hidden="true" className="size-3.5 text-accent" />
              {label}
            </span>

            <span className="font-mono text-sm font-black text-accent">+{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-line px-1 pt-3">
        <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
          <Activity aria-hidden="true" className="size-3.5" />
          {formation.isNeutral ? 'Availability' : 'Market guide'}
        </span>

        <span className="font-mono text-sm font-black text-accent">
          {formation.isNeutral ? 'Included' : formatFormationMarketValue(formation.marketValue)}
        </span>
      </div>
    </article>
  );
}
