'use client';

import { ArrowLeft, CalendarDays, Database, Footprints, Shirt } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatMarketValue } from '@/components/game/catalog-player-card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ApiRequestError } from '@/lib/api-client';
import { getPlayer, type PlayerDetail } from '@/lib/players-api';

interface PlayerDetailViewProps {
  playerId: string;
}

function playerInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not provided';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value));
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.status === 404) {
    return 'This player is unavailable or no longer active.';
  }

  return error instanceof ApiRequestError
    ? error.message
    : 'The player profile could not be loaded.';
}

export function PlayerDetailView({ playerId }: PlayerDetailViewProps) {
  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void getPlayer(playerId, {
      signal: controller.signal,
    })
      .then(setPlayer)
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(errorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [playerId, reloadKey]);

  function retryPlayer(): void {
    setLoading(true);
    setError(null);
    setReloadKey((current) => current + 1);
  }

  if (loading) {
    return <LoadingState label="Loading player profile" className="min-h-[32rem]" />;
  }

  if (error || !player) {
    return (
      <ErrorState
        title="Player unavailable"
        description={error ?? 'The requested player could not be found.'}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="secondary" onClick={retryPlayer}>
              Try again
            </Button>

            <Link href="/players" className={buttonVariants({ variant: 'ghost' })}>
              Player database
            </Link>
          </div>
        }
      />
    );
  }

  const attributes = [
    ['Overall', player.overall],
    ['Pace', player.pace],
    ['Shooting', player.shooting],
    ['Passing', player.passing],
    ['Dribbling', player.dribbling],
    ['Defending', player.defending],
    ['Physical', player.physical],
  ] as const;

  return (
    <div>
      <Link
        href="/players"
        className={buttonVariants({
          variant: 'ghost',
          size: 'sm',
          className: 'mb-5',
        })}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Player database
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <Card tone="accent" className="pitch-grid relative min-h-[34rem] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_34%,rgba(183,243,74,0.18),transparent_34%),linear-gradient(180deg,transparent,rgba(3,7,12,0.75))]" />

          <div className="relative flex h-full min-h-[34rem] flex-col p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-6xl font-black tracking-[-0.08em] text-foreground">
                  {player.overall}
                </p>

                <p className="mt-1 font-black tracking-[0.2em] text-accent">
                  {player.primaryPosition}
                </p>
              </div>

              <Badge tone="accent">{player.nationalityCode}</Badge>
            </div>

            <div className="grid flex-1 place-items-center">
              <div className="relative grid size-48 place-items-center rounded-full border border-white/10 bg-white/[0.045] shadow-[0_0_80px_rgba(183,243,74,0.1)]">
                <Shirt
                  aria-hidden="true"
                  className="absolute size-32 text-white/[0.055]"
                  strokeWidth={1}
                />

                <span className="relative font-mono text-5xl font-black tracking-[-0.08em]">
                  {playerInitials(player.fullName)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/45 p-5 backdrop-blur-md">
              <h1 className="text-3xl font-black tracking-[-0.045em] text-foreground">
                {player.fullName}
              </h1>

              <p className="mt-2 text-sm text-muted">
                {player.club?.name ?? 'Independent'} · {player.league?.name ?? 'No league'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {player.secondaryPositions.map((position) => (
                  <Badge key={position}>{position}</Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Player attributes</CardTitle>

              <p className="text-sm leading-6 text-muted">
                The seven core ratings used throughout KickoffBid.
              </p>
            </CardHeader>

            <CardContent>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {attributes.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-line bg-white/[0.035] p-4">
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                      {label}
                    </dt>

                    <dd className="mt-2 font-mono text-3xl font-black text-foreground">{value}</dd>
                  </div>
                ))}

                {player.primaryPosition === 'GK' && (
                  <div className="rounded-2xl border border-info/20 bg-info/[0.06] p-4">
                    <dt className="text-xs font-bold uppercase tracking-[0.12em] text-info">
                      Goalkeeping
                    </dt>

                    <dd className="mt-2 font-mono text-3xl font-black text-foreground">
                      {player.goalkeeping}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile information</CardTitle>
            </CardHeader>

            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-white/[0.025] p-4">
                  <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    <Footprints aria-hidden="true" className="size-4" />
                    Preferred foot
                  </dt>
                  <dd className="mt-2 font-extrabold text-foreground">{player.preferredFoot}</dd>
                </div>

                <div className="rounded-xl border border-line bg-white/[0.025] p-4">
                  <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    <CalendarDays aria-hidden="true" className="size-4" />
                    Date of birth
                  </dt>
                  <dd className="mt-2 font-extrabold text-foreground">
                    {formatDate(player.dateOfBirth)}
                  </dd>
                </div>

                <div className="rounded-xl border border-line bg-white/[0.025] p-4">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Nationality
                  </dt>
                  <dd className="mt-2 font-extrabold text-foreground">{player.nationalityCode}</dd>
                </div>

                <div className="rounded-xl border border-line bg-white/[0.025] p-4">
                  <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
                    Market guide
                  </dt>
                  <dd className="mt-2 font-mono font-black text-accent">
                    {formatMarketValue(player.marketValue)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-2xl border border-info/20 bg-info/[0.055] p-4">
            <Database aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-info" />

            <div>
              <p className="text-sm font-extrabold text-foreground">Controlled player record</p>

              <p className="mt-1 text-xs leading-5 text-muted">
                Data version {player.dataVersion}. Official photographs, club logos and game-card
                artwork are not used.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
