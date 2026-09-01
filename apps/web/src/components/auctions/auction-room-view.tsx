'use client';

import {
  ArrowLeft,
  CircleDollarSign,
  Gavel,
  History,
  Play,
  RefreshCcw,
  Radio,
  ShieldCheck,
  Trophy,
  UsersRound,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { LiveBidControl } from '@/components/auctions/live-bid-control';
import { AuctionNominationForm } from '@/components/auctions/auction-nomination-form';
import { FormationPitch } from '@/components/formations/formation-pitch';
import { CountdownTimer } from '@/components/ui/countdown-timer';
import { StatCard } from '@/components/game/stat-card';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/components/ui/toast';
import {
  cancelAuction,
  getAuctionHistory,
  getMatchAuctions,
  startAuction,
  type Auction,
  type AuctionEvent,
  type AuctionHistoryResponse,
  type AuctionMutationResult,
  type AuctionStatus,
} from '@/lib/auctions-api';
import {
  auctionSocketErrorMessage,
  auctionSocketErrorStatus,
  createAuctionSocket,
  type AuctionSocket,
  type AuctionSocketError,
} from '@/lib/auction-socket';
import { ApiRequestError, getCurrentUser, type PublicUser } from '@/lib/api-client';
import { getWallet, type Wallet } from '@/lib/wallet-api';
type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'OFFLINE';
type LifecycleAction = 'START' | 'CANCEL' | null;

const statusTones: Record<
  AuctionStatus,
  'neutral' | 'accent' | 'info' | 'success' | 'warning' | 'danger'
> = {
  WAITING: 'neutral',
  ACTIVE: 'accent',
  LAST_CALL: 'warning',
  SOLD: 'success',
  UNSOLD: 'info',
  CANCELLED: 'danger',
};

const terminalStatuses = new Set<AuctionStatus>(['SOLD', 'UNSOLD', 'CANCELLED']);

const eventDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatPrice(amount: number): string {
  const millions = amount / 1_000_000;

  return `€${millions.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}M`;
}

function statusLabel(status: AuctionStatus): string {
  return status.replaceAll('_', ' ');
}

function preferredAuction(auctions: Auction[]): Auction | null {
  return auctions.find((auction) => !terminalStatuses.has(auction.status)) ?? auctions[0] ?? null;
}

function upsertAuction(auctions: Auction[], updated: Auction): Auction[] {
  const existingIndex = auctions.findIndex((auction) => auction.id === updated.id);

  if (existingIndex === -1) {
    return [updated, ...auctions];
  }

  return auctions.map((auction) => (auction.id === updated.id ? updated : auction));
}

function idempotencyKey(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return `web:${globalThis.crypto.randomUUID()}`;
  }

  return `web:${Date.now()}:${Math.floor(Math.random() * 1_000_000)}`;
}

function eventTitle(event: AuctionEvent): string {
  return event.type.replaceAll('_', ' ');
}

function auctionAssetName(auction: Auction): string {
  if (auction.type === 'FORMATION') {
    return auction.formation?.name ?? 'Formation auction';
  }

  if (auction.type === 'MANAGER') {
    return auction.manager?.fullName ?? 'Manager auction';
  }

  return auction.player?.shortName ?? 'Player auction';
}
function PlayerSummary({ auction }: { auction: Auction }) {
  const player = auction.player;

  if (!player) {
    return (
      <EmptyState
        title="Player data unavailable"
        description="This auction does not contain a player record."
      />
    );
  }

  const stats = [
    ['PAC', player.pace],
    ['SHO', player.shooting],
    ['PAS', player.passing],
    ['DRI', player.dribbling],
    ['DEF', player.defending],
    ['PHY', player.physical],
  ];

  return (
    <Card tone="accent">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTones[auction.status]}>{statusLabel(auction.status)}</Badge>

            <Badge tone="info">{player.primaryPosition}</Badge>
          </div>

          {auction.endsAt && (auction.status === 'ACTIVE' || auction.status === 'LAST_CALL') && (
            <CountdownTimer targetTime={auction.endsAt} label="Auction time remaining" />
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="grid size-28 shrink-0 place-items-center rounded-3xl border border-accent/30 bg-accent/10">
            <div className="text-center">
              <p className="font-mono text-4xl font-black text-accent">{player.overall}</p>
              <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                Overall
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-black tracking-[-0.05em] text-foreground">
              {player.fullName}
            </h2>

            <p className="mt-2 text-sm text-muted">
              {player.club?.name ?? 'Free agent'} · {player.nationalityCode} · Nominated by{' '}
              {auction.nominatedBy.displayName}
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {stats.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-line bg-black/20 px-2 py-3 text-center"
                >
                  <p className="font-mono text-lg font-black text-foreground">{value}</p>
                  <p className="mt-1 text-[0.625rem] font-extrabold tracking-[0.12em] text-muted">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ManagerSummary({ auction }: { auction: Auction }) {
  const manager = auction.manager;

  if (!manager) {
    return (
      <EmptyState
        title="Manager data unavailable"
        description="This auction does not contain a manager record."
      />
    );
  }

  const stats = [
    ['ATK', manager.attacking],
    ['DEF', manager.defending],
    ['ADP', manager.adaptability],
    ['MAN', manager.manManagement],
  ];

  const bonuses = [
    ['Attack', manager.attackingBonus],
    ['Midfield', manager.midfieldBonus],
    ['Defence', manager.defendingBonus],
    ['Chemistry', manager.chemistryBonus],
  ];

  return (
    <Card tone="accent">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTones[auction.status]}>{statusLabel(auction.status)}</Badge>

            <Badge tone="info">Manager</Badge>
            <Badge tone="accent">{manager.tacticalStyle}</Badge>
          </div>

          {auction.endsAt && (auction.status === 'ACTIVE' || auction.status === 'LAST_CALL') && (
            <CountdownTimer targetTime={auction.endsAt} label="Auction time remaining" />
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="grid size-28 shrink-0 place-items-center rounded-3xl border border-info/30 bg-info/10">
            <div className="text-center">
              <p className="font-mono text-4xl font-black text-info">{manager.overall}</p>

              <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                Overall
              </p>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-black tracking-[-0.05em] text-foreground">
              {manager.fullName}
            </h2>

            <p className="mt-2 text-sm text-muted">
              {manager.club?.name ?? 'Independent'} / {manager.nationalityCode} / Nominated by{' '}
              {auction.nominatedBy.displayName}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {manager.preferredFormations.map((formation) => (
                <Badge key={formation}>{formation}</Badge>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-line bg-black/20 px-2 py-3 text-center"
                >
                  <p className="font-mono text-lg font-black text-foreground">{value}</p>

                  <p className="mt-1 text-[0.625rem] font-extrabold tracking-[0.12em] text-muted">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-black/20 p-3">
            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.12em] text-muted">
              Passing
            </p>
            <p className="mt-2 text-sm font-black text-foreground">{manager.passingPhilosophy}</p>
          </div>

          <div className="rounded-xl border border-line bg-black/20 p-3">
            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.12em] text-muted">
              Defence
            </p>
            <p className="mt-2 text-sm font-black text-foreground">{manager.defensivePhilosophy}</p>
          </div>

          <div className="rounded-xl border border-line bg-black/20 p-3">
            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.12em] text-muted">
              Pressing
            </p>
            <p className="mt-2 text-sm font-black text-foreground">{manager.pressingStyle}</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {bonuses.map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl border border-line bg-black/20 px-3 py-2"
            >
              <span className="text-xs font-bold text-muted">{label}</span>

              <span className="font-mono text-sm font-black text-accent">+{value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FormationSummary({ auction }: { auction: Auction }) {
  const formation = auction.formation;

  if (!formation) {
    return (
      <EmptyState
        title="Formation data unavailable"
        description="This auction does not contain a formation record."
      />
    );
  }

  const intensity = [
    ['WID', formation.width],
    ['TEM', formation.tempo],
    ['PRS', formation.pressingIntensity],
  ];

  const bonuses = [
    ['Attack', formation.attackingBonus],
    ['Midfield', formation.midfieldBonus],
    ['Defence', formation.defendingBonus],
    ['Chemistry', formation.chemistryBonus],
  ];

  return (
    <Card tone="accent">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTones[auction.status]}>{statusLabel(auction.status)}</Badge>

            <Badge tone="accent">Formation</Badge>
            <Badge tone="info">{formation.code}</Badge>
          </div>

          {auction.endsAt && (auction.status === 'ACTIVE' || auction.status === 'LAST_CALL') && (
            <CountdownTimer targetTime={auction.endsAt} label="Auction time remaining" />
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-7 md:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.28fr)]">
          <FormationPitch formation={formation} className="mx-auto w-full max-w-sm" />

          <div className="min-w-0">
            <h2 className="text-3xl font-black tracking-[-0.05em] text-foreground">
              {formation.name}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted">
              {formation.description ?? 'Balanced tactical formation.'}
            </p>

            <p className="mt-3 text-xs font-bold text-muted">
              Nominated by {auction.nominatedBy.displayName}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>{formation.buildUpStyle}</Badge>
              <Badge>{formation.attackingStyle}</Badge>
              <Badge>{formation.defensiveStyle}</Badge>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {intensity.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-line bg-black/20 px-2 py-3 text-center"
                >
                  <p className="font-mono text-lg font-black text-foreground">{value}</p>

                  <p className="mt-1 text-[0.625rem] font-extrabold tracking-[0.12em] text-muted">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {bonuses.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl border border-line bg-black/20 px-3 py-2"
                >
                  <span className="text-xs font-bold text-muted">{label}</span>

                  <span className="font-mono text-sm font-black text-accent">+{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export function AuctionAssetSummary({ auction }: { auction: Auction }) {
  if (auction.type === 'FORMATION') {
    return <FormationSummary auction={auction} />;
  }

  if (auction.type === 'MANAGER') {
    return <ManagerSummary auction={auction} />;
  }

  if (auction.type === 'PLAYER') {
    return <PlayerSummary auction={auction} />;
  }

  return (
    <EmptyState
      title="Unsupported auction asset"
      description="This auction type is not available in the current phase."
    />
  );
}
function AuctionHistory({ history }: { history: AuctionHistoryResponse | null }) {
  return (
    <Card tone="glass">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-info/10 text-info">
            <History aria-hidden="true" className="size-5" />
          </span>

          <div>
            <CardTitle>Immutable auction history</CardTitle>
            <CardDescription>Server-recorded lifecycle and bidding events.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {!history || history.data.length === 0 ? (
          <p className="py-5 text-center text-sm text-muted">
            No auction events have been recorded yet.
          </p>
        ) : (
          <ol>
            {history.data.map((event) => (
              <li
                key={event.id}
                className="flex gap-4 border-b border-line py-4 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white/[0.04] font-mono text-xs font-black text-muted">
                  {event.sequence}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={statusTones[event.statusAfter]}>{eventTitle(event)}</Badge>

                    {event.amount !== null && (
                      <span className="font-mono text-sm font-black text-foreground">
                        {formatPrice(event.amount)}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-bold text-foreground">
                    {event.participant?.displayName ?? 'KickoffBid auction engine'}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {eventDateFormatter.format(new Date(event.createdAt))}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export function AuctionRoomView() {
  const router = useRouter();
  const { showToast } = useToast();
  const socketRef = useRef<AuctionSocket | null>(null);

  const [user, setUser] = useState<PublicUser | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [history, setHistory] = useState<AuctionHistoryResponse | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [bidSubmitting, setBidSubmitting] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadAuctionRoom = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (!active) {
          return;
        }

        setUser(currentUser);

        const currentWallet = await getWallet(undefined, {
          signal: controller.signal,
        });

        const auctionList = await getMatchAuctions(
          currentWallet.matchId,
          {
            page: 1,
            pageSize: 100,
          },
          {
            signal: controller.signal,
          },
        );

        const currentAuction = preferredAuction(auctionList.data);

        const currentHistory = currentAuction
          ? await getAuctionHistory(
              currentAuction.id,
              {
                page: 1,
                pageSize: 100,
              },
              {
                signal: controller.signal,
              },
            )
          : null;

        if (active) {
          setWallet(currentWallet);
          setAuctions(auctionList.data);
          setAuction(currentAuction);
          setHistory(currentHistory);
          setRequestError(null);
        }
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
          setAuctions([]);
          setAuction(null);
          setHistory(null);
          setRequestError(null);
          return;
        }

        setRequestError('The auction room could not connect to the KickoffBid API.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadAuctionRoom();

    return () => {
      active = false;
      controller.abort();
    };
  }, [retryKey, router]);

  const matchId = wallet?.matchId;
  const auctionId = auction?.id;

  useEffect(() => {
    if (!matchId) {
      return;
    }

    let active = true;
    const socket = createAuctionSocket();

    socketRef.current = socket;

    const handleSocketError = (error: AuctionSocketError) => {
      const status = auctionSocketErrorStatus(error);

      setBidSubmitting(false);

      if (status === 401) {
        router.replace('/login');
        return;
      }

      showToast({
        title: 'Real-time request rejected',
        description: auctionSocketErrorMessage(error),
        tone: status === 429 ? 'warning' : 'danger',
      });
    };

    socket.on('connect', () => {
      setConnectionStatus('CONNECTING');
    });

    socket.on('auction:ready', () => {
      setConnectionStatus('LIVE');

      socket.emit('match:join', { matchId }, (response) => {
        if (!active) {
          return;
        }

        setAuctions(response.auctions.data);

        const nextAuction = preferredAuction(response.auctions.data);

        if (nextAuction) {
          setAuction((current) => current ?? nextAuction);
        }
      });

      if (auctionId) {
        socket.emit('auction:join', { auctionId }, (response) => {
          if (active) {
            setAuction(response.auction);
          }
        });
      }
    });

    socket.on('auction:updated', (result) => {
      if (!active || result.auction.matchId !== matchId) {
        return;
      }

      setAuctions((current) => upsertAuction(current, result.auction));

      setAuction((current) => {
        if (!current || current.id === result.auction.id) {
          return result.auction;
        }

        if (terminalStatuses.has(current.status) && !terminalStatuses.has(result.auction.status)) {
          return result.auction;
        }

        return current;
      });

      void Promise.all([
        getWallet(matchId),
        getAuctionHistory(result.auction.id, {
          page: 1,
          pageSize: 100,
        }),
      ])
        .then(([updatedWallet, updatedHistory]) => {
          if (active) {
            setWallet(updatedWallet);
            setHistory(updatedHistory);
          }
        })
        .catch(() => {
          // The real-time auction snapshot is still authoritative.
        });
    });

    socket.on('auction:error', handleSocketError);
    socket.on('exception', handleSocketError);

    socket.on('disconnect', () => {
      setConnectionStatus('OFFLINE');
    });

    socket.connect();

    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();

      if (socketRef.current === socket) {
        socketRef.current = null;
      }
    };
  }, [auctionId, matchId, router, showToast]);

  const retry = () => {
    setLoading(true);
    setConnectionStatus('CONNECTING');
    setRequestError(null);
    setRetryKey((current) => current + 1);
  };

  const refreshRelatedData = async (updatedAuctionId: string) => {
    if (!wallet) {
      return;
    }

    const [updatedWallet, updatedHistory] = await Promise.all([
      getWallet(wallet.matchId),
      getAuctionHistory(updatedAuctionId, {
        page: 1,
        pageSize: 100,
      }),
    ]);

    setWallet(updatedWallet);
    setHistory(updatedHistory);
  };

  const applyMutation = (result: AuctionMutationResult) => {
    setAuction(result.auction);
    setAuctions((current) => upsertAuction(current, result.auction));

    void refreshRelatedData(result.auction.id);
  };

  const placeBid = (amount: number) => {
    const socket = socketRef.current;

    if (!socket?.connected || !auction) {
      showToast({
        title: 'Live connection unavailable',
        description: 'Wait for the auction socket to reconnect before bidding.',
        tone: 'warning',
      });
      return;
    }

    setBidSubmitting(true);

    socket.emit(
      'auction:bid',
      {
        auctionId: auction.id,
        amount,
        idempotencyKey: idempotencyKey(),
      },
      (result) => {
        setBidSubmitting(false);
        applyMutation(result);

        showToast({
          title: result.replayed ? 'Bid already recorded' : 'Bid accepted',
          description: `The leading bid is now ${formatPrice(result.auction.currentPrice)}.`,
          tone: result.replayed ? 'info' : 'success',
        });
      },
    );
  };

  const startCurrentAuction = async () => {
    if (!auction) {
      return;
    }

    setLifecycleAction('START');

    try {
      const result = await startAuction(auction.id, {
        durationSeconds: 30,
      });

      applyMutation(result);

      showToast({
        title: 'Auction started',
        description: 'The 30-second live bidding window is open.',
        tone: 'success',
      });
    } catch (error: unknown) {
      showToast({
        title: 'Auction could not start',
        description:
          error instanceof ApiRequestError
            ? error.message
            : 'Check the API connection and try again.',
        tone: 'danger',
      });
    } finally {
      setLifecycleAction(null);
    }
  };

  const cancelCurrentAuction = async () => {
    if (!auction) {
      return;
    }

    setLifecycleAction('CANCEL');

    try {
      const result = await cancelAuction(auction.id);

      applyMutation(result);

      showToast({
        title: 'Auction cancelled',
        description: 'Any reserved winning bid has been returned safely.',
        tone: 'info',
      });
    } catch (error: unknown) {
      showToast({
        title: 'Auction could not be cancelled',
        description:
          error instanceof ApiRequestError
            ? error.message
            : 'Check the API connection and try again.',
        tone: 'danger',
      });
    } finally {
      setLifecycleAction(null);
    }
  };

  const selectAuction = async (selected: Auction) => {
    setAuction(selected);
    setHistory(null);

    try {
      setHistory(
        await getAuctionHistory(selected.id, {
          page: 1,
          pageSize: 100,
        }),
      );
    } catch {
      showToast({
        title: 'History unavailable',
        description: 'The selected auction history could not be loaded.',
        tone: 'danger',
      });
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Connecting to the live auction engine" className="w-full max-w-md" />
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
          className="w-full max-w-md"
        />
      </main>
    );
  }

  const isHost = wallet?.isHost ?? false;

  const hasOpenAuction = auctions.some((item) => !terminalStatuses.has(item.status));

  const ownLeadingReservation =
    auction?.highestBid?.bidder.userId === user.id ? auction.highestBid.amount : 0;

  const maximumBid = wallet ? wallet.availableBudget + ownLeadingReservation : 0;

  const connectionTone =
    connectionStatus === 'LIVE'
      ? 'success'
      : connectionStatus === 'CONNECTING'
        ? 'warning'
        : 'danger';

  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar displayName={user.displayName} email={user.email} />

      <main className="min-w-0 flex-1 pb-28 lg:pb-0">
        <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={connectionTone}>
                  {connectionStatus === 'LIVE' ? 'Live connection' : connectionStatus}
                </Badge>

                {wallet && <Badge tone="info">{wallet.roomCode}</Badge>}

                {auction && (
                  <Badge tone={statusTones[auction.status]}>{statusLabel(auction.status)}</Badge>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Auction room
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Server-authoritative bids, synchronized countdowns, protected budgets, and immutable
                auction results.
              </p>
            </div>

            <Link href="/dashboard" className={buttonVariants({ variant: 'secondary' })}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Dashboard
            </Link>
          </header>

          {wallet && isHost && !hasOpenAuction && (
            <div className="mt-7">
              <AuctionNominationForm matchId={wallet.matchId} onCreated={applyMutation} />
            </div>
          )}

          {!wallet ? (
            <EmptyState
              title="No active match auction"
              description="Join a match to receive a €150M wallet and access its protected auction room."
              icon={Gavel}
              className="mt-7"
              action={
                <Link href="/players" className={buttonVariants({ variant: 'secondary' })}>
                  Browse players
                </Link>
              }
            />
          ) : !auction ? (
            <EmptyState
              title="Waiting for a nomination"
              description={
                wallet.isHost
                  ? 'Use the nomination form above to select the first player, manager, or formation.'
                  : 'There are no auctions in this match yet. Waiting for the match host to nominate a player, manager, or formation.'
              }
              icon={UsersRound}
              className="mt-7"
              action={<Badge tone="info">{wallet.roomCode}</Badge>}
            />
          ) : (
            <>
              <section
                aria-label="Auction summary"
                className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              >
                <StatCard
                  label="Current price"
                  value={formatPrice(auction.currentPrice)}
                  detail={`Opening price ${formatPrice(auction.openingPrice)}`}
                  icon={Gavel}
                  tone="accent"
                />

                <StatCard
                  label="Available budget"
                  value={formatPrice(wallet.availableBudget)}
                  detail={`${formatPrice(wallet.reservedBudget)} currently reserved`}
                  icon={CircleDollarSign}
                  tone="info"
                />

                <StatCard
                  label="Accepted bids"
                  value={String(auction.bidCount)}
                  detail={`Minimum increment ${formatPrice(auction.minimumIncrement)}`}
                  icon={UsersRound}
                />

                <StatCard
                  label="Security"
                  value="Server"
                  detail={`Auction version ${auction.version}`}
                  icon={ShieldCheck}
                  tone="accent"
                />
              </section>

              <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.2fr)_minmax(22rem,0.8fr)]">
                <div className="space-y-7">
                  <AuctionAssetSummary auction={auction} />

                  {auctions.length > 1 && (
                    <Card tone="glass">
                      <CardHeader>
                        <CardTitle>Match auctions</CardTitle>
                        <CardDescription>
                          Open a previous auction and inspect its result.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="grid gap-2 sm:grid-cols-2">
                        {auctions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => void selectAuction(item)}
                            className={
                              item.id === auction.id
                                ? 'rounded-xl border border-accent/30 bg-accent/10 p-4 text-left'
                                : 'rounded-xl border border-line bg-black/20 p-4 text-left transition hover:border-line-strong hover:bg-white/[0.04]'
                            }
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="truncate text-sm font-extrabold text-foreground">
                                {auctionAssetName(item)}
                              </p>

                              <Badge tone={statusTones[item.status]}>
                                {statusLabel(item.status)}
                              </Badge>
                            </div>

                            <p className="mt-2 font-mono text-sm font-black text-muted">
                              {formatPrice(item.currentPrice)}
                            </p>
                          </button>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  <AuctionHistory history={history} />
                </div>

                <aside className="space-y-5">
                  <Card tone="glass">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <CardTitle>Live bidding</CardTitle>
                          <CardDescription>
                            Every accepted bid is transactional and idempotent.
                          </CardDescription>
                        </div>

                        <Radio
                          aria-hidden="true"
                          className={
                            connectionStatus === 'LIVE'
                              ? 'size-5 text-success'
                              : 'size-5 text-muted'
                          }
                        />
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="rounded-2xl border border-line bg-black/20 p-4">
                        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">
                          Highest bidder
                        </p>

                        <p className="mt-2 text-lg font-black text-foreground">
                          {auction.highestBid?.bidder.displayName ?? 'No accepted bids'}
                        </p>

                        <p className="mt-1 font-mono text-sm font-bold text-muted">
                          {auction.highestBid
                            ? formatPrice(auction.highestBid.amount)
                            : `Starts at ${formatPrice(auction.openingPrice)}`}
                        </p>
                      </div>

                      {auction.status === 'WAITING' &&
                        (isHost ? (
                          <Button
                            type="button"
                            className="mt-5 w-full"
                            onClick={() => void startCurrentAuction()}
                            disabled={lifecycleAction !== null}
                          >
                            <Play aria-hidden="true" className="size-4" />
                            {lifecycleAction === 'START'
                              ? 'Starting auction…'
                              : 'Start 30-second auction'}
                          </Button>
                        ) : (
                          <p className="mt-5 rounded-xl border border-line bg-white/[0.035] p-4 text-center text-sm text-muted">
                            Waiting for the match host to start bidding.
                          </p>
                        ))}

                      {(auction.status === 'ACTIVE' || auction.status === 'LAST_CALL') &&
                        auction.minimumNextBid !== null && (
                          <div className="mt-5">
                            <LiveBidControl
                              minimumBid={auction.minimumNextBid}
                              maximumBid={maximumBid}
                              increment={auction.minimumIncrement}
                              submitting={bidSubmitting}
                              disabled={connectionStatus !== 'LIVE'}
                              onBid={placeBid}
                            />
                          </div>
                        )}

                      {auction.status === 'SOLD' && (
                        <div className="mt-5 rounded-2xl border border-success/25 bg-success/[0.07] p-5 text-center">
                          <Trophy aria-hidden="true" className="mx-auto size-7 text-success" />
                          <p className="mt-3 font-extrabold text-foreground">
                            Sold to {auction.winner?.displayName}
                          </p>
                          <p className="mt-1 font-mono text-sm font-black text-success">
                            {formatPrice(auction.currentPrice)}
                          </p>
                        </div>
                      )}

                      {auction.status === 'UNSOLD' && (
                        <p className="mt-5 rounded-xl border border-info/25 bg-info/[0.06] p-4 text-center text-sm font-bold text-info">
                          Auction closed without an accepted bid.
                        </p>
                      )}

                      {auction.status === 'CANCELLED' && (
                        <p className="mt-5 rounded-xl border border-danger/25 bg-danger/[0.06] p-4 text-center text-sm font-bold text-danger">
                          This auction was cancelled by the match host.
                        </p>
                      )}

                      {isHost && !terminalStatuses.has(auction.status) && (
                        <Button
                          type="button"
                          variant="danger"
                          className="mt-4 w-full"
                          onClick={() => void cancelCurrentAuction()}
                          disabled={lifecycleAction !== null}
                        >
                          <XCircle aria-hidden="true" className="size-4" />
                          {lifecycleAction === 'CANCEL' ? 'Cancelling…' : 'Cancel auction'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
