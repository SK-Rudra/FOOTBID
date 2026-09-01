'use client';

import { Search, ShieldCheck, UserMinus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import type { SaveSquadPlayerInput, SquadInventoryPlayer, SquadRole } from '@/lib/squads-api';
import { cn } from '@/lib/utils';

interface SquadPlayerPoolProps {
  players: SquadInventoryPlayer[];
  assignments: SaveSquadPlayerInput[];
  selectedPlayerId: string | null;
  disabled?: boolean;
  onSelect: (playerId: string) => void;
  onSetRole: (playerId: string, role: Exclude<SquadRole, 'STARTER'>) => void;
  onRemove: (playerId: string) => void;
}

const roleTones: Record<SquadRole, 'accent' | 'info' | 'neutral'> = {
  STARTER: 'accent',
  SUBSTITUTE: 'info',
  RESERVE: 'neutral',
};

function formatPrice(amount: number): string {
  const millions = amount / 1_000_000;

  return `€${millions.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}M`;
}

export function SquadPlayerPool({
  players,
  assignments,
  selectedPlayerId,
  disabled = false,
  onSelect,
  onSetRole,
  onRemove,
}: SquadPlayerPoolProps) {
  const [search, setSearch] = useState('');

  const assignmentsByPlayer = new Map(
    assignments.map((assignment) => [assignment.playerId, assignment]),
  );

  const visiblePlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return players;
    }

    return players.filter(
      (player) =>
        player.fullName.toLowerCase().includes(query) ||
        player.shortName.toLowerCase().includes(query) ||
        player.primaryPosition.toLowerCase().includes(query),
    );
  }, [players, search]);

  return (
    <section>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted"
        />

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search owned players"
          aria-label="Search owned players"
          className="pl-11"
        />
      </div>

      {visiblePlayers.length === 0 ? (
        <EmptyState
          title="No owned players found"
          description="Clear the search or return to the auction room."
          className="mt-4"
        />
      ) : (
        <div className="mt-4 grid max-h-[42rem] gap-3 overflow-y-auto pr-1">
          {visiblePlayers.map((player) => {
            const assignment = assignmentsByPlayer.get(player.id);
            const selected = selectedPlayerId === player.id;

            return (
              <article
                key={player.id}
                draggable={!disabled}
                onDragStart={(event) => {
                  event.dataTransfer.setData('text/kickoffbid-player', player.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                className={cn(
                  'rounded-2xl border bg-black/20 p-3 transition',
                  selected ? 'border-info/60 bg-info/[0.08]' : 'border-line hover:border-accent/30',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-xl border border-accent/20 bg-accent/10">
                    <span className="font-mono text-lg font-black text-accent">
                      {player.overall}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-black text-foreground">
                        {player.shortName}
                      </p>

                      <Badge tone="info">{player.primaryPosition}</Badge>

                      {assignment && (
                        <Badge tone={roleTones[assignment.role]}>{assignment.role}</Badge>
                      )}
                    </div>

                    <p className="mt-1 truncate text-xs text-muted">
                      {player.club?.shortName ?? 'Free agent'} /{' '}
                      {formatPrice(player.acquisitionPrice)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? 'primary' : 'secondary'}
                    disabled={disabled}
                    onClick={() => onSelect(player.id)}
                  >
                    <ShieldCheck aria-hidden="true" className="size-3.5" />
                    {assignment?.role === 'STARTER' ? 'Move' : 'Select'}
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => onSetRole(player.id, 'SUBSTITUTE')}
                  >
                    Sub
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => onSetRole(player.id, 'RESERVE')}
                  >
                    Reserve
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={disabled || !assignment}
                    onClick={() => onRemove(player.id)}
                  >
                    <UserMinus aria-hidden="true" className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
