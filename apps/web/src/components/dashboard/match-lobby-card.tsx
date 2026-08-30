'use client';

import { Copy, DoorOpen, Gavel, LoaderCircle, Plus, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/components/ui/toast';
import { ApiRequestError } from '@/lib/api-client';
import {
  createMatch,
  getCurrentMatch,
  getMatch,
  joinMatch,
  type MatchLobby,
} from '@/lib/matches-api';

type LobbyAction = 'CREATE' | 'JOIN' | null;

function formatPrice(amount: number): string {
  const millions = amount / 1_000_000;

  return `€${millions.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}M`;
}

function matchStatusLabel(status: MatchLobby['status']): string {
  return status.replaceAll('_', ' ');
}

export function MatchLobbyCard() {
  const { showToast } = useToast();

  const [match, setMatch] = useState<MatchLobby | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeError, setRoomCodeError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<LobbyAction>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadCurrentMatch = async () => {
      try {
        const currentMatch = await getCurrentMatch({
          signal: controller.signal,
        });

        if (active) {
          setMatch(currentMatch);
          setRequestError(null);
        }
      } catch {
        if (active) {
          setRequestError('Your current match lobby could not be loaded.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCurrentMatch();

    return () => {
      active = false;
      controller.abort();
    };
  }, [retryKey]);

  const matchId = match?.id;
  const matchIsFull = match?.isFull ?? false;

  useEffect(() => {
    if (!matchId || matchIsFull) {
      return;
    }

    let active = true;

    const refreshLobby = async () => {
      try {
        const updatedMatch = await getMatch(matchId);

        if (active) {
          setMatch(updatedMatch);
        }
      } catch {
        // Keep the last valid lobby snapshot and retry automatically.
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshLobby();
    }, 3_000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [matchId, matchIsFull]);

  const retry = () => {
    setLoading(true);
    setRequestError(null);
    setRetryKey((current) => current + 1);
  };

  const createRoom = async () => {
    setAction('CREATE');

    try {
      const createdMatch = await createMatch();

      setMatch(createdMatch);

      showToast({
        title: 'Match room created',
        description: `Share room code ${createdMatch.roomCode} with your opponent.`,
        tone: 'success',
      });
    } catch (error: unknown) {
      showToast({
        title: 'Room could not be created',
        description:
          error instanceof ApiRequestError
            ? error.message
            : 'Check the API connection and try again.',
        tone: 'danger',
      });
    } finally {
      setAction(null);
    }
  };

  const joinRoom = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedRoomCode = roomCode.trim().toUpperCase();

    if (!/^[A-Z0-9]{8,12}$/.test(normalizedRoomCode)) {
      setRoomCodeError('Enter the 8–12 character room code shared by the host.');
      return;
    }

    setRoomCodeError(null);
    setAction('JOIN');

    try {
      const joinedMatch = await joinMatch({
        roomCode: normalizedRoomCode,
      });

      setMatch(joinedMatch);

      showToast({
        title: 'Match joined',
        description: `You joined room ${joinedMatch.roomCode}.`,
        tone: 'success',
      });
    } catch (error: unknown) {
      const description =
        error instanceof ApiRequestError
          ? error.message
          : 'Check the API connection and try again.';

      setRoomCodeError(description);

      showToast({
        title: 'Room could not be joined',
        description,
        tone: 'danger',
      });
    } finally {
      setAction(null);
    }
  };

  const copyRoomCode = async () => {
    if (!match) {
      return;
    }

    try {
      await navigator.clipboard.writeText(match.roomCode);

      showToast({
        title: 'Room code copied',
        description: match.roomCode,
        tone: 'info',
      });
    } catch {
      showToast({
        title: 'Copy unavailable',
        description: `The room code is ${match.roomCode}.`,
        tone: 'warning',
      });
    }
  };

  if (loading) {
    return (
      <Card tone="glass">
        <CardContent className="pt-5 sm:pt-6">
          <LoadingState label="Checking your match lobby" />
        </CardContent>
      </Card>
    );
  }

  if (requestError) {
    return (
      <ErrorState
        description={requestError}
        action={
          <Button type="button" onClick={retry}>
            Try again
          </Button>
        }
      />
    );
  }

  if (!match) {
    return (
      <Card tone="glass">
        <CardHeader>
          <Badge tone="accent" className="w-fit">
            Matchmaking
          </Badge>

          <CardTitle className="mt-2">Create or join a match</CardTitle>

          <CardDescription>
            Start a private two-manager room or enter the code shared by another manager.
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="rounded-xl border border-line bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                <Plus aria-hidden="true" className="size-5" />
              </div>

              <div>
                <p className="font-extrabold text-foreground">Host a new match</p>

                <p className="mt-1 text-xs leading-5 text-muted">
                  You will receive a private room code and become Player One.
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void createRoom()}
              disabled={action !== null}
              className="mt-4 w-full"
            >
              {action === 'CREATE' ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Plus aria-hidden="true" className="size-4" />
              )}

              {action === 'CREATE' ? 'Creating room…' : 'Create match'}
            </Button>
          </div>

          <form onSubmit={joinRoom} className="rounded-xl border border-line bg-black/20 p-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-info/10 text-info">
                <DoorOpen aria-hidden="true" className="size-5" />
              </div>

              <div>
                <p className="font-extrabold text-foreground">Join an opponent</p>

                <p className="mt-1 text-xs leading-5 text-muted">
                  Enter the private code provided by the match host.
                </p>
              </div>
            </div>

            <FormField
              label="Room code"
              htmlFor="match-room-code"
              error={roomCodeError ?? undefined}
              required
            >
              <Input
                id="match-room-code"
                value={roomCode}
                onChange={(event) => {
                  setRoomCode(event.target.value.toUpperCase());
                  setRoomCodeError(null);
                }}
                placeholder="ABCD2345"
                minLength={8}
                maxLength={12}
                autoComplete="off"
                spellCheck={false}
                disabled={action !== null}
                hasError={Boolean(roomCodeError)}
                aria-describedby={roomCodeError ? 'match-room-code-message' : undefined}
                className="font-mono uppercase tracking-[0.18em]"
              />
            </FormField>

            <Button
              type="submit"
              variant="secondary"
              disabled={action !== null}
              className="mt-4 w-full"
            >
              {action === 'JOIN' ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <DoorOpen aria-hidden="true" className="size-4" />
              )}

              {action === 'JOIN' ? 'Joining room…' : 'Join match'}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card tone="accent">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge tone={match.isFull ? 'success' : 'warning'}>
            {matchStatusLabel(match.status)}
          </Badge>

          <Badge tone="neutral">{match.isHost ? 'Match host' : 'Player Two'}</Badge>
        </div>

        <CardTitle className="mt-2">Private match room</CardTitle>

        <CardDescription>
          {match.isFull
            ? 'Both managers are connected. The auction room is ready.'
            : 'Share the room code and wait for your opponent to join.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/20 bg-black/25 p-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">Room code</p>

            <p className="mt-1 font-mono text-2xl font-black tracking-[0.16em] text-accent">
              {match.roomCode}
            </p>
          </div>

          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => void copyRoomCode()}
            aria-label="Copy room code"
          >
            <Copy aria-hidden="true" className="size-4" />
          </Button>
        </div>

        <div className="mt-4 space-y-2">
          {match.participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-black/20 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-muted">
                  <UsersRound aria-hidden="true" className="size-4" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-foreground">
                    {participant.displayName}
                  </p>

                  <p className="truncate text-xs text-muted">@{participant.username}</p>
                </div>
              </div>

              <Badge tone={participant.isHost ? 'accent' : 'info'}>
                {participant.isHost ? 'Host' : 'Opponent'}
              </Badge>
            </div>
          ))}

          {!match.isFull && (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-line-strong p-3 text-muted">
              <div className="grid size-9 place-items-center rounded-lg bg-white/[0.04]">
                <UsersRound aria-hidden="true" className="size-4" />
              </div>

              <p className="text-sm font-bold">Waiting for Player Two…</p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-line bg-black/20 px-4 py-3">
          <p className="text-xs text-muted">Protected budget per manager</p>

          <p className="mt-1 font-mono text-sm font-black text-foreground">
            {formatPrice(match.budgetPerParticipant)}
          </p>
        </div>

        {match.isFull ? (
          <Link
            href="/auctions"
            className={buttonVariants({
              className: 'mt-5 w-full',
            })}
          >
            <Gavel aria-hidden="true" className="size-4" />
            Open auction room
          </Link>
        ) : (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold text-muted">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Checking for your opponent
          </div>
        )}
      </CardContent>
    </Card>
  );
}
