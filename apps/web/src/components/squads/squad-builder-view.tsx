'use client';

import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  LoaderCircle,
  LockKeyhole,
  Play,
  RefreshCcw,
  Save,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { SquadPitch } from '@/components/squads/squad-pitch';
import { SquadPlayerPool } from '@/components/squads/squad-player-pool';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { ApiRequestError, getCurrentUser, type PublicUser } from '@/lib/api-client';
import {
  getSquad,
  lockSquad,
  saveSquad,
  startSquadBuilding,
  type SaveSquadPlayerInput,
  type SquadResponse,
  type SquadRole,
} from '@/lib/squads-api';
import { getWallet, type Wallet } from '@/lib/wallet-api';

const SUBSTITUTE_SLOTS = {
  start: 12,
  end: 18,
};

const RESERVE_SLOTS = {
  start: 19,
  end: 30,
};

function orderedAssignments(assignments: SaveSquadPlayerInput[]): SaveSquadPlayerInput[] {
  return [...assignments].sort((left, right) => left.slot - right.slot);
}

function responseMessage(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

function statusLabel(status: string): string {
  return status.replaceAll('_', ' ');
}

export function SquadBuilderView() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [response, setResponse] = useState<SquadResponse | null>(null);

  const [name, setName] = useState('Match Squad');
  const [formationId, setFormationId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [assignments, setAssignments] = useState<SaveSquadPlayerInput[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [starting, setStarting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const applySnapshot = useCallback((nextResponse: SquadResponse): void => {
    const ownedFormation =
      nextResponse.inventory.formations.find((formation) => formation.access === 'OWNED') ??
      nextResponse.inventory.formations[0];

    const ownedManager =
      nextResponse.inventory.managers.find((manager) => manager.access === 'OWNED') ??
      nextResponse.inventory.managers[0];

    setResponse(nextResponse);
    setName(nextResponse.squad?.name ?? 'Match Squad');
    setFormationId(nextResponse.squad?.formationId ?? ownedFormation?.id ?? '');
    setManagerId(nextResponse.squad?.managerId ?? ownedManager?.id ?? '');
    setAssignments(
      orderedAssignments(
        nextResponse.squad?.players.map((assignment) => ({
          playerId: assignment.playerId,
          slot: assignment.slot,
          role: assignment.role,
          isCaptain: assignment.isCaptain,
        })) ?? [],
      ),
    );
    setSelectedPlayerId(null);
    setDirty(false);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadBuilder = async (): Promise<void> => {
      try {
        const currentUser = await getCurrentUser();

        if (!active) {
          return;
        }

        setUser(currentUser);

        const currentWallet = await getWallet(undefined, {
          signal: controller.signal,
        });

        const squadResponse = await getSquad(currentWallet.matchId, {
          signal: controller.signal,
        });

        if (!active) {
          return;
        }

        setWallet(currentWallet);
        applySnapshot(squadResponse);
        setRequestError(null);
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        if (error instanceof ApiRequestError && error.status === 401) {
          router.replace('/login');
          return;
        }

        if (error instanceof ApiRequestError && error.status === 404) {
          setWallet(null);
          setResponse(null);
          setRequestError(null);
          return;
        }

        setRequestError(
          responseMessage(error, 'The squad builder could not connect to the KickoffBid API.'),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadBuilder();

    return () => {
      active = false;
      controller.abort();
    };
  }, [applySnapshot, retryKey, router]);

  const players = useMemo(() => response?.inventory.players ?? [], [response]);

  const playersById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const selectedFormation = useMemo(
    () =>
      response?.inventory.formations.find((formation) => formation.id === formationId) ??
      (response?.squad?.formationId === formationId ? response.squad.formation : null),
    [formationId, response],
  );

  const starterAssignments = useMemo(
    () => orderedAssignments(assignments.filter((assignment) => assignment.role === 'STARTER')),
    [assignments],
  );

  const substituteAssignments = assignments.filter(
    (assignment) => assignment.role === 'SUBSTITUTE',
  );

  const reserveAssignments = assignments.filter((assignment) => assignment.role === 'RESERVE');

  const captainAssignment = starterAssignments.find((assignment) => assignment.isCaptain);

  const starterSlots = new Set(starterAssignments.map((assignment) => assignment.slot));

  const completeStartingEleven =
    starterAssignments.length === 11 &&
    starterSlots.size === 11 &&
    Array.from({ length: 11 }, (_, index) => index + 1).every((slot) => starterSlots.has(slot));

  const hasCaptain = starterAssignments.filter((assignment) => assignment.isCaptain).length === 1;

  const canEdit = Boolean(response?.canEdit) && !Boolean(response?.squad?.isLocked);

  const canSave =
    canEdit && dirty && Boolean(formationId) && Boolean(managerId) && !saving && !locking;

  const canLock =
    canEdit &&
    Boolean(response?.squad) &&
    !dirty &&
    completeStartingEleven &&
    hasCaptain &&
    !saving &&
    !locking;

  const selectedPlayer = selectedPlayerId ? playersById.get(selectedPlayerId) : null;

  const retry = (): void => {
    setLoading(true);
    setRequestError(null);
    setRetryKey((current) => current + 1);
  };

  const markDirty = (): void => {
    setDirty(true);
  };

  const choosePlayer = (playerId: string): void => {
    if (!canEdit) {
      return;
    }

    setSelectedPlayerId((current) => (current === playerId ? null : playerId));
  };

  const assignStarter = (playerId: string, targetSlot: number): void => {
    if (!canEdit) {
      return;
    }

    setAssignments((current) => {
      const movingAssignment = current.find((assignment) => assignment.playerId === playerId);

      const targetAssignment = current.find(
        (assignment) =>
          assignment.role === 'STARTER' &&
          assignment.slot === targetSlot &&
          assignment.playerId !== playerId,
      );

      const nextAssignments = current.filter(
        (assignment) =>
          assignment.playerId !== playerId && assignment.playerId !== targetAssignment?.playerId,
      );

      if (movingAssignment && targetAssignment) {
        nextAssignments.push({
          ...targetAssignment,
          slot: movingAssignment.slot,
          role: movingAssignment.role,
          isCaptain: movingAssignment.role === 'STARTER' ? targetAssignment.isCaptain : false,
        });
      }

      nextAssignments.push({
        playerId,
        slot: targetSlot,
        role: 'STARTER',
        isCaptain: movingAssignment?.isCaptain ?? false,
      });

      return orderedAssignments(nextAssignments);
    });

    setSelectedPlayerId(null);
    markDirty();
  };

  const setPlayerRole = (playerId: string, role: Exclude<SquadRole, 'STARTER'>): void => {
    if (!canEdit) {
      return;
    }

    const range = role === 'SUBSTITUTE' ? SUBSTITUTE_SLOTS : RESERVE_SLOTS;

    setAssignments((current) => {
      const withoutPlayer = current.filter((assignment) => assignment.playerId !== playerId);

      const usedSlots = new Set(
        withoutPlayer
          .filter((assignment) => assignment.role === role)
          .map((assignment) => assignment.slot),
      );

      let availableSlot: number | null = null;

      for (let slot = range.start; slot <= range.end; slot += 1) {
        if (!usedSlots.has(slot)) {
          availableSlot = slot;
          break;
        }
      }

      if (availableSlot === null) {
        showToast({
          title: role === 'SUBSTITUTE' ? 'Substitute bench is full' : 'Reserve list is full',
          description:
            role === 'SUBSTITUTE'
              ? 'Remove a substitute before adding another.'
              : 'Remove a reserve before adding another.',
          tone: 'warning',
        });

        return current;
      }

      return orderedAssignments([
        ...withoutPlayer,
        {
          playerId,
          slot: availableSlot,
          role,
          isCaptain: false,
        },
      ]);
    });

    setSelectedPlayerId(null);
    markDirty();
  };

  const removePlayer = (playerId: string): void => {
    if (!canEdit) {
      return;
    }

    setAssignments((current) => current.filter((assignment) => assignment.playerId !== playerId));

    setSelectedPlayerId((current) => (current === playerId ? null : current));

    markDirty();
  };

  const chooseCaptain = (playerId: string): void => {
    if (!canEdit) {
      return;
    }

    setAssignments((current) =>
      current.map((assignment) => ({
        ...assignment,
        isCaptain: assignment.role === 'STARTER' && assignment.playerId === playerId,
      })),
    );

    markDirty();
  };

  const saveDraft = async (): Promise<void> => {
    if (!wallet || !response || !canSave) {
      return;
    }

    setSaving(true);

    try {
      const savedSquad = await saveSquad(wallet.matchId, {
        version: response.squad?.version ?? 0,
        name: name.trim() || 'Match Squad',
        formationId,
        managerId,
        players: orderedAssignments(assignments),
      });

      setResponse((current) =>
        current
          ? {
              ...current,
              squad: savedSquad,
            }
          : current,
      );

      setName(savedSquad.name);
      setAssignments(
        orderedAssignments(
          savedSquad.players.map((assignment) => ({
            playerId: assignment.playerId,
            slot: assignment.slot,
            role: assignment.role,
            isCaptain: assignment.isCaptain,
          })),
        ),
      );
      setSelectedPlayerId(null);
      setDirty(false);

      showToast({
        title: 'Squad draft saved',
        description: `Version ${savedSquad.version} is now stored securely.`,
        tone: 'success',
      });
    } catch (error: unknown) {
      showToast({
        title: 'Squad save failed',
        description: responseMessage(error, 'Check the squad assignments and try again.'),
        tone: 'danger',
      });
    } finally {
      setSaving(false);
    }
  };

  const confirmLock = async (): Promise<void> => {
    if (!wallet || !response?.squad || !canLock) {
      return;
    }

    setLocking(true);

    try {
      const result = await lockSquad(wallet.matchId, {
        version: response.squad.version,
      });

      setResponse((current) =>
        current
          ? {
              ...current,
              match: {
                ...current.match,
                status: result.matchStatus,
              },
              participant: {
                ...current.participant,
                status: 'READY',
              },
              canEdit: false,
              squad: result.squad,
            }
          : current,
      );

      setAssignments(
        orderedAssignments(
          result.squad.players.map((assignment) => ({
            playerId: assignment.playerId,
            slot: assignment.slot,
            role: assignment.role,
            isCaptain: assignment.isCaptain,
          })),
        ),
      );
      setDirty(false);
      setLockModalOpen(false);

      showToast({
        title: result.replayed ? 'Squad already locked' : 'Squad locked',
        description:
          result.matchStatus === 'READY'
            ? 'Both squads are ready for kickoff.'
            : 'Your opponent still needs to lock their squad.',
        tone: 'success',
      });
    } catch (error: unknown) {
      showToast({
        title: 'Squad lock failed',
        description: responseMessage(error, 'Save a valid starting eleven and try again.'),
        tone: 'danger',
      });
    } finally {
      setLocking(false);
    }
  };

  const beginSquadBuilding = async (): Promise<void> => {
    if (!wallet || !response?.match.isHost || starting) {
      return;
    }

    setStarting(true);

    try {
      await startSquadBuilding(wallet.matchId);

      const updatedResponse = await getSquad(wallet.matchId);
      applySnapshot(updatedResponse);

      showToast({
        title: 'Squad building started',
        description: 'Both participants can now prepare their teams.',
        tone: 'success',
      });
    } catch (error: unknown) {
      showToast({
        title: 'Could not start squad building',
        description: responseMessage(error, 'Finish the required auctions and try again.'),
        tone: 'danger',
      });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Loading your private squad builder" className="w-full max-w-md" />
      </main>
    );
  }

  if (requestError || !user) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <ErrorState
          description={requestError ?? 'Your manager profile is unavailable.'}
          action={
            <Button type="button" onClick={retry}>
              <RefreshCcw aria-hidden="true" className="size-4" />
              Try again
            </Button>
          }
        />
      </main>
    );
  }

  if (!wallet || !response) {
    return (
      <div className="flex min-h-dvh">
        <DashboardSidebar displayName={user.displayName} email={user.email} />

        <main className="flex-1 px-4 py-8 pb-28 sm:px-6 lg:px-10 lg:pb-10">
          <EmptyState
            title="No active match"
            description="Create or join a match before building a squad."
            icon={UsersRound}
            action={
              <Link href="/dashboard" className={buttonVariants({ variant: 'primary' })}>
                Return to dashboard
              </Link>
            }
          />
        </main>
      </div>
    );
  }

  const squadPhase =
    response.match.status === 'SQUAD_BUILDING' || response.match.status === 'READY';

  if (!squadPhase) {
    const hostCanStart = response.match.isHost && response.match.status === 'AUCTION';

    return (
      <div className="flex min-h-dvh">
        <DashboardSidebar displayName={user.displayName} email={user.email} />

        <main className="flex-1 px-4 py-8 pb-28 sm:px-6 lg:px-10 lg:pb-10">
          <div className="mx-auto max-w-5xl">
            <Link href="/dashboard" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Dashboard
            </Link>

            <Card tone="glass" className="mt-6">
              <CardContent className="py-12">
                <EmptyState
                  title="Squad building has not started"
                  description={
                    hostCanStart
                      ? 'Start squad building after the auction requirements have been completed.'
                      : 'Wait for the match host to finish the auctions and open squad building.'
                  }
                  icon={ShieldCheck}
                  action={
                    hostCanStart ? (
                      <Button
                        type="button"
                        onClick={() => void beginSquadBuilding()}
                        disabled={starting}
                      >
                        {starting ? (
                          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                        ) : (
                          <Play aria-hidden="true" className="size-4" />
                        )}

                        {starting ? 'Starting...' : 'Start squad building'}
                      </Button>
                    ) : (
                      <Link
                        href="/auctions"
                        className={buttonVariants({
                          variant: 'secondary',
                        })}
                      >
                        Return to auction room
                      </Link>
                    )
                  }
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const ratings = response.squad?.ratings;
  const squadLocked = Boolean(response.squad?.isLocked);

  const ratingItems = [
    ['Attack', ratings?.attack ?? 0],
    ['Midfield', ratings?.midfield ?? 0],
    ['Defense', ratings?.defense ?? 0],
    ['Goalkeeper', ratings?.goalkeeper ?? 0],
    ['Overall', ratings?.overall ?? 0],
    ['Chemistry', ratings?.chemistry ?? 0],
  ];

  return (
    <>
      <div className="flex min-h-dvh">
        <DashboardSidebar displayName={user.displayName} email={user.email} />

        <main className="min-w-0 flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-8 lg:pb-10">
          <div className="mx-auto max-w-[96rem]">
            <header className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <Link
                  href="/dashboard"
                  className={buttonVariants({
                    variant: 'ghost',
                    size: 'sm',
                  })}
                >
                  <ArrowLeft aria-hidden="true" className="size-4" />
                  Dashboard
                </Link>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone="accent">{response.match.roomCode}</Badge>
                  <Badge tone={response.match.status === 'READY' ? 'success' : 'info'}>
                    {statusLabel(response.match.status)}
                  </Badge>

                  {squadLocked && (
                    <Badge tone="success">
                      <CheckCircle2 aria-hidden="true" className="mr-1 size-3" />
                      Locked
                    </Badge>
                  )}

                  {response.match.opponentLocked && <Badge tone="neutral">Opponent ready</Badge>}
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-foreground sm:text-4xl">
                  Squad builder
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  Arrange your owned players, choose your manager and formation, appoint a captain,
                  then save and lock the final team.
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={retry}
                disabled={saving || locking}
              >
                <RefreshCcw aria-hidden="true" className="size-4" />
                Refresh
              </Button>
            </header>

            {!canEdit && (
              <div className="mt-6 flex items-start gap-3 rounded-2xl border border-success/25 bg-success/[0.08] px-4 py-4">
                <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success" />

                <div>
                  <p className="text-sm font-black text-foreground">This squad is read-only</p>

                  <p className="mt-1 text-sm text-muted">
                    {squadLocked
                      ? 'Your final squad has been locked securely.'
                      : 'Editing is unavailable during the current match phase.'}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
              <div className="space-y-7">
                <Card tone="accent">
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>StartingStarting eleven</CardTitle>
                        <CardDescription>
                          Select or drag an owned player onto a formation slot.
                        </CardDescription>
                      </div>

                      <Badge tone={completeStartingEleven ? 'success' : 'warning'}>
                        {starterAssignments.length}/11 starters
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {selectedPlayer && canEdit && (
                      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-info/30 bg-info/[0.08] px-4 py-3">
                        <p className="text-sm text-foreground">
                          Place <strong className="font-black">{selectedPlayer.shortName}</strong>{' '}
                          into a pitch slot.
                        </p>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedPlayerId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {selectedFormation ? (
                      <SquadPitch
                        formation={selectedFormation}
                        players={players}
                        assignments={assignments}
                        selectedPlayerId={selectedPlayerId}
                        disabled={!canEdit}
                        onAssign={assignStarter}
                        onSelectPlayer={choosePlayer}
                      />
                    ) : (
                      <EmptyState
                        title="Choose a formation"
                        description="Select an available formation to display its pitch."
                      />
                    )}
                  </CardContent>
                </Card>

                <Card tone="glass">
                  <CardHeader>
                    <CardTitle>Owned player pool</CardTitle>
                    <CardDescription>
                      Assign starters, substitutes, and reserves from your auction inventory.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <SquadPlayerPool
                      players={players}
                      assignments={assignments}
                      selectedPlayerId={selectedPlayerId}
                      disabled={!canEdit}
                      onSelect={choosePlayer}
                      onSetRole={setPlayerRole}
                      onRemove={removePlayer}
                    />
                  </CardContent>
                </Card>
              </div>

              <aside className="space-y-7">
                <Card tone="glass">
                  <CardHeader>
                    <CardTitle>Team configuration</CardTitle>
                    <CardDescription>
                      These selections are private until the match begins.
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    <FormField label="Squad name" htmlFor="squad-name" required>
                      <Input
                        id="squad-name"
                        value={name}
                        maxLength={80}
                        disabled={!canEdit}
                        onChange={(event) => {
                          setName(event.target.value);
                          markDirty();
                        }}
                      />
                    </FormField>

                    <FormField label="Formation" htmlFor="squad-formation" required>
                      <Select
                        id="squad-formation"
                        value={formationId}
                        disabled={!canEdit}
                        onChange={(event) => {
                          setFormationId(event.target.value);
                          setSelectedPlayerId(null);
                          markDirty();
                        }}
                      >
                        <option value="">Choose formation</option>

                        {response.inventory.formations.map((formation) => (
                          <option key={formation.id} value={formation.id}>
                            {formation.code} / {formation.name} / {formation.access}
                          </option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField label="Manager" htmlFor="squad-manager" required>
                      <Select
                        id="squad-manager"
                        value={managerId}
                        disabled={!canEdit}
                        onChange={(event) => {
                          setManagerId(event.target.value);
                          markDirty();
                        }}
                      >
                        <option value="">Choose manager</option>

                        {response.inventory.managers.map((manager) => (
                          <option key={manager.id} value={manager.id}>
                            {manager.fullName} / {manager.tacticalStyle} / {manager.access}
                          </option>
                        ))}
                      </Select>
                    </FormField>

                    <FormField
                      label="Captain"
                      htmlFor="squad-captain"
                      hint="Only a starting player can be captain."
                      required
                    >
                      <Select
                        id="squad-captain"
                        value={captainAssignment?.playerId ?? ''}
                        disabled={!canEdit || starterAssignments.length === 0}
                        onChange={(event) => chooseCaptain(event.target.value)}
                      >
                        <option value="">Choose captain</option>

                        {starterAssignments.map((assignment) => {
                          const player = playersById.get(assignment.playerId);

                          return (
                            <option key={assignment.playerId} value={assignment.playerId}>
                              {player?.shortName ?? assignment.playerId}
                            </option>
                          );
                        })}
                      </Select>
                    </FormField>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!canSave}
                        onClick={() => void saveDraft()}
                      >
                        {saving ? (
                          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                        ) : (
                          <Save aria-hidden="true" className="size-4" />
                        )}

                        {saving ? 'Saving...' : 'Save draft'}
                      </Button>

                      <Button
                        type="button"
                        disabled={!canLock}
                        onClick={() => setLockModalOpen(true)}
                      >
                        <LockKeyhole aria-hidden="true" className="size-4" />
                        Lock squad
                      </Button>
                    </div>

                    {dirty && (
                      <p className="text-xs font-bold text-warning">
                        You have unsaved squad changes.
                      </p>
                    )}

                    {!completeStartingEleven && (
                      <p className="text-xs text-muted">
                        Fill all eleven starter slots before locking.
                      </p>
                    )}

                    {completeStartingEleven && !hasCaptain && (
                      <p className="text-xs text-muted">Appoint exactly one starter as captain.</p>
                    )}
                  </CardContent>
                </Card>

                <Card tone="glass">
                  <CardHeader>
                    <CardTitle>Server ratings</CardTitle>
                    <CardDescription>
                      Ratings are recalculated after each saved draft.
                    </CardDescription>
                  </CardHeader>

                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {ratingItems.map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-line bg-black/20 p-3">
                          <p className="text-xs font-bold text-muted">{label}</p>

                          <p className="mt-1 font-mono text-2xl font-black text-foreground">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {ratings && (
                      <div className="mt-3 rounded-xl border border-accent/25 bg-accent/[0.07] p-3">
                        <p className="text-xs font-bold text-muted">Squad power</p>

                        <p className="mt-1 font-mono text-3xl font-black text-accent">
                          {ratings.squadPower}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card tone="glass">
                  <CardHeader>
                    <CardTitle>Selection summary</CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-line bg-black/20 px-4 py-3">
                      <span className="text-sm font-bold text-muted">Starters</span>
                      <span className="font-mono font-black text-foreground">
                        {starterAssignments.length}/11
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-line bg-black/20 px-4 py-3">
                      <span className="text-sm font-bold text-muted">Substitutes</span>
                      <span className="font-mono font-black text-foreground">
                        {substituteAssignments.length}/7
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-line bg-black/20 px-4 py-3">
                      <span className="text-sm font-bold text-muted">Reserves</span>
                      <span className="font-mono font-black text-foreground">
                        {reserveAssignments.length}/12
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-line bg-black/20 px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-bold text-muted">
                        <Crown aria-hidden="true" className="size-4 text-warning" />
                        Captain
                      </span>

                      <span className="max-w-36 truncate text-sm font-black text-foreground">
                        {captainAssignment
                          ? (playersById.get(captainAssignment.playerId)?.shortName ?? 'Selected')
                          : 'Not selected'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </div>
        </main>
      </div>

      <Modal
        open={lockModalOpen}
        onOpenChange={setLockModalOpen}
        title="Lock this squad?"
        description="Locking is final. You will not be able to change the formation, manager, captain, or player assignments."
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={locking}
              onClick={() => setLockModalOpen(false)}
            >
              Keep editing
            </Button>

            <Button type="button" disabled={locking} onClick={() => void confirmLock()}>
              {locking ? (
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <LockKeyhole aria-hidden="true" className="size-4" />
              )}

              {locking ? 'Locking...' : 'Confirm lock'}
            </Button>
          </>
        }
      >
        <div className="rounded-2xl border border-warning/25 bg-warning/[0.08] p-4">
          <div className="flex gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-warning" />

            <div>
              <p className="text-sm font-black text-foreground">Final squad check</p>

              <p className="mt-2 text-sm leading-6 text-muted">
                Your squad contains {starterAssignments.length} starters and{' '}
                {captainAssignment ? 'one captain' : 'no captain'}.
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
