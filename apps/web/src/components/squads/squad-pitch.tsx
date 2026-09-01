'use client';

import { Crown, Plus } from 'lucide-react';
import type { CatalogFormation } from '@/lib/formations-api';
import type { SaveSquadPlayerInput, SquadInventoryPlayer } from '@/lib/squads-api';
import { cn } from '@/lib/utils';

interface SquadPitchProps {
  formation: Pick<CatalogFormation, 'code' | 'shape'>;
  players: SquadInventoryPlayer[];
  assignments: SaveSquadPlayerInput[];
  selectedPlayerId: string | null;
  disabled?: boolean;
  onAssign: (playerId: string, slot: number) => void;
  onSelectPlayer: (playerId: string) => void;
}

function clampCoordinate(value: number): number {
  return Math.min(94, Math.max(6, value));
}

export function SquadPitch({
  formation,
  players,
  assignments,
  selectedPlayerId,
  disabled = false,
  onAssign,
  onSelectPlayer,
}: SquadPitchProps) {
  const playersById = new Map(players.map((player) => [player.id, player]));

  const assignmentsBySlot = new Map(
    assignments
      .filter(({ role }) => role === 'STARTER')
      .map((assignment) => [assignment.slot, assignment]),
  );

  return (
    <div
      aria-label={`${formation.code} interactive squad pitch`}
      className="relative aspect-[5/6] overflow-hidden rounded-[1.75rem] border border-accent/25 bg-[linear-gradient(180deg,rgba(183,243,74,0.12),rgba(8,18,14,0.96)),repeating-linear-gradient(90deg,transparent_0,transparent_16.5%,rgba(255,255,255,0.025)_16.5%,rgba(255,255,255,0.025)_33%)] shadow-[0_28px_90px_rgba(0,0,0,0.35)]"
    >
      <div className="absolute inset-[5%] rounded-xl border border-white/20" />
      <div className="absolute inset-x-[5%] top-1/2 border-t border-white/20" />
      <div className="absolute top-1/2 left-1/2 size-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <div className="absolute top-[5%] left-1/2 h-[15%] w-[42%] -translate-x-1/2 border-x border-b border-white/20" />
      <div className="absolute bottom-[5%] left-1/2 h-[15%] w-[42%] -translate-x-1/2 border-x border-t border-white/20" />
      <div className="absolute top-[5%] left-1/2 h-[6%] w-[20%] -translate-x-1/2 border-x border-b border-white/20" />
      <div className="absolute bottom-[5%] left-1/2 h-[6%] w-[20%] -translate-x-1/2 border-x border-t border-white/20" />

      {formation.shape.slots.map((formationSlot) => {
        const assignment = assignmentsBySlot.get(formationSlot.slot);
        const player = assignment ? playersById.get(assignment.playerId) : null;
        const selected = player?.id === selectedPlayerId;

        return (
          <div
            key={formationSlot.slot}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${clampCoordinate(formationSlot.x)}%`,
              top: `${clampCoordinate(formationSlot.y)}%`,
            }}
            onDragOver={(event) => {
              if (!disabled) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => {
              if (disabled) {
                return;
              }

              event.preventDefault();

              const playerId = event.dataTransfer.getData('text/kickoffbid-player');

              if (playerId) {
                onAssign(playerId, formationSlot.slot);
              }
            }}
          >
            <button
              type="button"
              disabled={disabled}
              draggable={Boolean(player) && !disabled}
              onDragStart={(event) => {
                if (!player) {
                  event.preventDefault();
                  return;
                }

                event.dataTransfer.setData('text/kickoffbid-player', player.id);
                event.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => {
                if (disabled) {
                  return;
                }

                if (selectedPlayerId) {
                  onAssign(selectedPlayerId, formationSlot.slot);
                  return;
                }

                if (player) {
                  onSelectPlayer(player.id);
                }
              }}
              aria-label={
                player
                  ? `${player.shortName}, ${formationSlot.position}, slot ${formationSlot.slot}`
                  : `${formationSlot.position} slot ${formationSlot.slot}`
              }
              className={cn(
                'group relative grid min-h-14 min-w-14 place-items-center rounded-2xl border px-2 py-1.5 text-center shadow-[0_9px_24px_rgba(0,0,0,0.5)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-h-16 sm:min-w-16',
                player
                  ? 'border-accent/45 bg-[#101b17] hover:-translate-y-0.5 hover:border-accent'
                  : 'border-dashed border-white/25 bg-black/35 text-white/55 hover:border-accent/60 hover:text-accent',
                selected && 'border-info bg-info/15 ring-2 ring-info/40',
              )}
            >
              {assignment?.isCaptain && (
                <Crown
                  aria-label="Captain"
                  className="absolute -top-2 -right-2 size-5 rounded-full bg-warning p-1 text-black"
                />
              )}

              {player ? (
                <>
                  <span className="max-w-20 truncate text-[0.625rem] font-black text-foreground sm:text-xs">
                    {player.shortName}
                  </span>

                  <span className="font-mono text-[0.5625rem] font-black text-accent">
                    {player.overall} / {formationSlot.position}
                  </span>
                </>
              ) : (
                <>
                  <Plus aria-hidden="true" className="size-3.5" />

                  <span className="font-mono text-[0.5625rem] font-black">
                    {formationSlot.position}
                  </span>
                </>
              )}
            </button>
          </div>
        );
      })}

      <span className="absolute right-3 bottom-2 rounded-lg border border-white/10 bg-black/50 px-2 py-1 font-mono text-[0.625rem] font-black text-white/65">
        {formation.code}
      </span>
    </div>
  );
}
