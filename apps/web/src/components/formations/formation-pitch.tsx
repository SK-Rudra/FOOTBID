import type { CatalogFormation } from '@/lib/formations-api';
import { cn } from '@/lib/utils';

interface FormationPitchProps {
  formation: Pick<CatalogFormation, 'code' | 'shape'>;
  className?: string;
}

function clampCoordinate(value: number): number {
  return Math.min(94, Math.max(6, value));
}

export function FormationPitch({ formation, className }: FormationPitchProps) {
  return (
    <div
      role="img"
      aria-label={`${formation.code} formation shape`}
      className={cn(
        'relative aspect-[5/6] overflow-hidden rounded-2xl border border-accent/20 bg-[linear-gradient(180deg,rgba(183,243,74,0.1),rgba(8,18,14,0.94)),repeating-linear-gradient(90deg,transparent_0,transparent_16.5%,rgba(255,255,255,0.025)_16.5%,rgba(255,255,255,0.025)_33%)]',
        className,
      )}
    >
      <div className="absolute inset-[5%] rounded-lg border border-white/20" />
      <div className="absolute inset-x-[5%] top-1/2 border-t border-white/20" />
      <div className="absolute top-1/2 left-1/2 size-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <div className="absolute top-[5%] left-1/2 h-[15%] w-[42%] -translate-x-1/2 border-x border-b border-white/20" />
      <div className="absolute bottom-[5%] left-1/2 h-[15%] w-[42%] -translate-x-1/2 border-x border-t border-white/20" />
      <div className="absolute top-[5%] left-1/2 h-[6%] w-[20%] -translate-x-1/2 border-x border-b border-white/20" />
      <div className="absolute bottom-[5%] left-1/2 h-[6%] w-[20%] -translate-x-1/2 border-x border-t border-white/20" />

      {formation.shape.slots.map((slot) => (
        <span
          key={slot.slot}
          title={`Slot ${slot.slot}: ${slot.position}`}
          aria-label={`Slot ${slot.slot}: ${slot.position}`}
          className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-accent/40 bg-[#101b17] font-mono text-[0.625rem] font-black text-accent shadow-[0_5px_18px_rgba(0,0,0,0.45)]"
          style={{
            left: `${clampCoordinate(slot.x)}%`,
            top: `${clampCoordinate(slot.y)}%`,
          }}
        >
          {slot.position}
        </span>
      ))}

      <span className="absolute right-3 bottom-2 rounded-lg border border-white/10 bg-black/45 px-2 py-1 font-mono text-[0.625rem] font-black text-white/65">
        {formation.code}
      </span>
    </div>
  );
}
