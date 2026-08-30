'use client';

import { Coins, LogOut, ShieldCheck, Sparkles, Trophy, UsersRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BidControl } from '@/components/game/bid-control';
import { PlayerCard, type PlayerCardData } from '@/components/game/player-card';
import { StatCard } from '@/components/game/stat-card';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useToast } from '@/components/ui/toast';
import { apiRequest, ApiRequestError, getCurrentUser, type PublicUser } from '@/lib/api-client';

const scoutingShortlist: PlayerCardData[] = [
  {
    name: 'Amara Okoye',
    position: 'LW',
    overall: 84,
    club: 'Riverton Pulse',
    nationality: 'Nigeria',
    priceMillions: 22,
    stats: {
      attack: 89,
      control: 85,
      defense: 38,
    },
  },
  {
    name: 'Theo Marin',
    position: 'DM',
    overall: 83,
    club: 'Union Caldera',
    nationality: 'France',
    priceMillions: 19,
    stats: {
      attack: 66,
      control: 84,
      defense: 87,
    },
  },
];

export function DashboardView() {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (active) {
          setUser(currentUser);
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

        setRequestError('The dashboard could not connect to FOOTBID.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadUser();

    return () => {
      active = false;
    };
  }, [retryKey, router]);

  const retry = () => {
    setLoading(true);
    setRequestError(null);
    setRetryKey((current) => current + 1);
  };

  const logout = async () => {
    setLoggingOut(true);

    try {
      await apiRequest<void>('/api/v1/auth/logout', {
        method: 'POST',
      });

      showToast({
        title: 'Signed out',
        description: 'Your FOOTBID session has been closed.',
        tone: 'info',
      });

      router.replace('/login');
      router.refresh();
    } catch {
      showToast({
        title: 'Could not sign out',
        description: 'Check your connection and try again.',
        tone: 'danger',
      });
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Preparing your manager dashboard" className="w-full max-w-md" />
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
              Try again
            </Button>
          }
          className="w-full max-w-md"
        />
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar displayName={user.displayName} email={user.email} />

      <main className="min-w-0 flex-1 pb-28 lg:pb-0">
        <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Manager HQ</Badge>
                <Badge tone={user.role === 'ADMIN' ? 'warning' : 'neutral'}>{user.role}</Badge>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Welcome, {user.displayName}.
              </h1>

              <p className="mt-2 text-sm leading-6 text-muted">
                Your secure account, player database, and €150M wallet foundation are ready.
              </p>
            </div>

            <Button type="button" variant="secondary" onClick={logout} disabled={loggingOut}>
              <LogOut aria-hidden="true" className="size-4" />
              {loggingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </header>

          <section aria-labelledby="manager-summary" className="mt-7">
            <h2 id="manager-summary" className="sr-only">
              Manager summary
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Match wallet"
                value="€150M"
                detail="Protected by server-side budget validation."
                icon={Coins}
                tone="accent"
              />

              <StatCard
                label="Starting eleven"
                value="0 / 11"
                detail="No squad has been assembled yet."
                icon={UsersRound}
                tone="info"
              />

              <StatCard
                label="Ranking"
                value="—"
                detail="Competitive ranking begins with matches."
                icon={Trophy}
              />

              <StatCard
                label="Account"
                value="Secure"
                detail="Protected by a revocable server session."
                icon={ShieldCheck}
                tone="accent"
              />
            </div>
          </section>

          <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
            <section aria-labelledby="shortlist-heading">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <Badge tone="info">Visual preview</Badge>

                  <h2
                    id="shortlist-heading"
                    className="mt-3 text-2xl font-black tracking-[-0.04em]"
                  >
                    Scouting shortlist
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Fictional players demonstrating the reusable card system.
                  </p>
                </div>

                <span className="inline-flex items-center gap-2 text-xs font-bold text-muted">
                  <Sparkles aria-hidden="true" className="size-4 text-info" />
                  Search the live player database
                </span>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                {scoutingShortlist.map((player, index) => (
                  <PlayerCard key={player.name} player={player} featured={index === 0} />
                ))}
              </div>
            </section>

            <section aria-labelledby="auction-preview-heading" className="space-y-5">
              <Card tone="glass">
                <CardHeader>
                  <Badge tone="neutral" className="w-fit">
                    Component preview
                  </Badge>

                  <CardTitle id="auction-preview-heading" className="mt-2">
                    Bid controls
                  </CardTitle>

                  <CardDescription>
                    This interaction is visual only. It does not alter your database or budget.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <BidControl
                    minimumBidMillions={18}
                    budgetMillions={35}
                    onBid={(bid) =>
                      showToast({
                        title: `Preview bid: €${bid}M`,
                        description: 'No real auction was changed.',
                        tone: 'info',
                      })
                    }
                  />
                </CardContent>
              </Card>

              <EmptyState
                title="No active match"
                description="Matchmaking and live game rooms will be introduced in later phases."
                action={<Badge tone="neutral">Roadmap locked</Badge>}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
