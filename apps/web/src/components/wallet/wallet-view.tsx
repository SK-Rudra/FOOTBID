'use client';

import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  History,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { StatCard } from '@/components/game/stat-card';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { Badge } from '@/components/ui/badge';
import { buttonVariants, Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Select } from '@/components/ui/select';
import { ApiRequestError, getCurrentUser, type PublicUser } from '@/lib/api-client';
import {
  BUDGET_TRANSACTION_TYPES,
  getBudgetTransactions,
  getWallet,
  type BudgetTransaction,
  type BudgetTransactionHistory,
  type BudgetTransactionType,
  type Wallet,
} from '@/lib/wallet-api';

type TransactionFilter = 'ALL' | BudgetTransactionType;

const transactionDateFormatter = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const transactionLabels: Record<BudgetTransactionType, string> = {
  RESERVATION: 'Reservation',
  RELEASE: 'Release',
  PURCHASE: 'Purchase',
  REFUND: 'Refund',
};

const transactionTones: Record<BudgetTransactionType, 'accent' | 'info' | 'success' | 'warning'> = {
  RESERVATION: 'warning',
  RELEASE: 'info',
  PURCHASE: 'accent',
  REFUND: 'success',
};

function formatBudget(amount: number): string {
  const millions = amount / 1_000_000;

  return `€${millions.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}M`;
}

function transactionAmount(transaction: BudgetTransaction): string {
  const positive = transaction.type === 'RELEASE' || transaction.type === 'REFUND';

  return `${positive ? '+' : '−'}${formatBudget(transaction.amount)}`;
}

function transactionTitle(transaction: BudgetTransaction): string {
  if (transaction.description) {
    return transaction.description;
  }

  if (transaction.itemType && transaction.itemId) {
    return `${transaction.itemType.toLowerCase()} transaction`;
  }

  return transactionLabels[transaction.type];
}

function TransactionRow({ transaction }: { transaction: BudgetTransaction }) {
  const positive = transaction.type === 'RELEASE' || transaction.type === 'REFUND';

  return (
    <li className="grid gap-4 border-b border-line py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={transactionTones[transaction.type]}>
            {transactionLabels[transaction.type]}
          </Badge>

          {transaction.itemType && (
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted">
              {transaction.itemType}
            </span>
          )}
        </div>

        <p className="mt-3 truncate text-sm font-extrabold text-foreground">
          {transactionTitle(transaction)}
        </p>

        <p className="mt-1 text-xs text-muted">
          {transactionDateFormatter.format(new Date(transaction.createdAt))}
        </p>
      </div>

      <div className="sm:text-right">
        <p
          className={
            positive
              ? 'font-mono text-lg font-black text-success'
              : 'font-mono text-lg font-black text-foreground'
          }
        >
          {transactionAmount(transaction)}
        </p>

        <p className="mt-1 text-xs text-muted">
          Available after: {formatBudget(transaction.availableAfter)}
        </p>
      </div>
    </li>
  );
}

export function WalletView() {
  const router = useRouter();

  const [user, setUser] = useState<PublicUser | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [history, setHistory] = useState<BudgetTransactionHistory | null>(null);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadWallet = async () => {
      try {
        const currentUser = await getCurrentUser();

        if (!active) {
          return;
        }

        setUser(currentUser);

        const currentWallet = await getWallet(undefined, {
          signal: controller.signal,
        });

        const currentHistory = await getBudgetTransactions(
          {
            matchId: currentWallet.matchId,
            page: 1,
            pageSize: 100,
          },
          {
            signal: controller.signal,
          },
        );

        if (active) {
          setWallet(currentWallet);
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
          setHistory(null);
          setRequestError(null);
          return;
        }

        setRequestError('Your wallet could not be loaded. Check the API connection and try again.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadWallet();

    return () => {
      active = false;
      controller.abort();
    };
  }, [retryKey, router]);

  const transactions = useMemo(() => {
    if (!history) {
      return [];
    }

    if (transactionFilter === 'ALL') {
      return history.data;
    }

    return history.data.filter((transaction) => transaction.type === transactionFilter);
  }, [history, transactionFilter]);

  const retry = () => {
    setLoading(true);
    setRequestError(null);
    setRetryKey((current) => current + 1);
  };

  if (loading) {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <LoadingState label="Loading your secure match wallet" className="w-full max-w-md" />
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

  const availablePercentage = wallet ? (wallet.availableBudget / wallet.startingBudget) * 100 : 0;
  const reservedPercentage = wallet ? (wallet.reservedBudget / wallet.startingBudget) * 100 : 0;
  const spentPercentage = wallet ? (wallet.spentBudget / wallet.startingBudget) * 100 : 0;

  return (
    <div className="flex min-h-dvh">
      <DashboardSidebar displayName={user.displayName} email={user.email} />

      <main className="min-w-0 flex-1 pb-28 lg:pb-0">
        <div className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-5 border-b border-line pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Server controlled</Badge>

                {wallet && (
                  <>
                    <Badge tone="info">{wallet.roomCode}</Badge>
                    <Badge tone="neutral">{wallet.matchStatus.replaceAll('_', ' ')}</Badge>
                  </>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Match wallet
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                Your €150M budget is validated and recorded by the FOOTBID server. The browser
                cannot directly change balances or create transactions.
              </p>
            </div>

            <Link
              href="/dashboard"
              className={buttonVariants({
                variant: 'secondary',
                size: 'sm',
              })}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Dashboard
            </Link>
          </header>

          {!wallet || !history ? (
            <EmptyState
              title="No active match wallet"
              description="A secure €150M wallet will be created automatically when you join a match. Match rooms arrive in a later phase."
              icon={WalletCards}
              action={<Badge tone="neutral">Waiting for matchmaking</Badge>}
              className="mt-7 min-h-96"
            />
          ) : (
            <>
              <section aria-labelledby="wallet-summary" className="mt-7">
                <h2 id="wallet-summary" className="sr-only">
                  Wallet summary
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    label="Available budget"
                    value={formatBudget(wallet.availableBudget)}
                    detail="Funds available for future server-approved bids."
                    icon={Coins}
                    tone="accent"
                  />

                  <StatCard
                    label="Reserved"
                    value={formatBudget(wallet.reservedBudget)}
                    detail="Funds secured against active auction commitments."
                    icon={LockKeyhole}
                    tone="info"
                  />

                  <StatCard
                    label="Spent"
                    value={formatBudget(wallet.spentBudget)}
                    detail="Completed purchases recorded in the ledger."
                    icon={CircleDollarSign}
                  />

                  <StatCard
                    label="Starting wallet"
                    value={formatBudget(wallet.startingBudget)}
                    detail="Every participant begins with exactly €150M."
                    icon={WalletCards}
                    tone="accent"
                  />
                </div>
              </section>

              <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
                <section aria-labelledby="transaction-history">
                  <Card tone="glass">
                    <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <History aria-hidden="true" className="size-5 text-accent" />

                          <CardTitle id="transaction-history">Transaction history</CardTitle>
                        </div>

                        <CardDescription className="mt-2">
                          Immutable reservations, releases, purchases, and refunds for this match.
                        </CardDescription>
                      </div>

                      <label className="w-full sm:w-48">
                        <span className="sr-only">Filter transaction history</span>

                        <Select
                          value={transactionFilter}
                          onChange={(event) =>
                            setTransactionFilter(event.target.value as TransactionFilter)
                          }
                          aria-label="Filter transaction history"
                        >
                          <option value="ALL">All transactions</option>

                          {BUDGET_TRANSACTION_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {transactionLabels[type]}
                            </option>
                          ))}
                        </Select>
                      </label>
                    </CardHeader>

                    <CardContent>
                      {transactions.length === 0 ? (
                        <EmptyState
                          title="No matching transactions"
                          description={
                            history.pagination.total === 0
                              ? 'Your spending history will appear after the server processes an auction commitment.'
                              : 'No transactions match the selected filter.'
                          }
                          className="min-h-64"
                        />
                      ) : (
                        <ul>
                          {transactions.map((transaction) => (
                            <TransactionRow key={transaction.id} transaction={transaction} />
                          ))}
                        </ul>
                      )}

                      {history.pagination.total > history.data.length && (
                        <p className="mt-4 text-xs text-muted">
                          Showing the latest {history.data.length} of {history.pagination.total}{' '}
                          ledger entries.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <aside className="space-y-5">
                  <Card tone="accent">
                    <CardHeader>
                      <Badge tone="accent" className="w-fit">
                        Budget conservation
                      </Badge>

                      <CardTitle className="mt-2">Every euro is accounted for</CardTitle>

                      <CardDescription>
                        Available, reserved, and spent balances must always total the original €150M
                        wallet.
                      </CardDescription>
                    </CardHeader>

                    <CardContent>
                      <div
                        className="flex h-3 overflow-hidden rounded-full bg-black/30"
                        aria-label="Wallet allocation"
                      >
                        <span
                          className="bg-accent"
                          style={{ width: `${availablePercentage}%` }}
                          title="Available budget"
                        />

                        <span
                          className="bg-info"
                          style={{ width: `${reservedPercentage}%` }}
                          title="Reserved budget"
                        />

                        <span
                          className="bg-warning"
                          style={{ width: `${spentPercentage}%` }}
                          title="Spent budget"
                        />
                      </div>

                      <dl className="mt-5 space-y-3">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <dt className="text-muted">Available</dt>
                          <dd className="font-mono font-black text-accent">
                            {formatBudget(wallet.availableBudget)}
                          </dd>
                        </div>

                        <div className="flex items-center justify-between gap-4 text-sm">
                          <dt className="text-muted">Reserved</dt>
                          <dd className="font-mono font-black text-info">
                            {formatBudget(wallet.reservedBudget)}
                          </dd>
                        </div>

                        <div className="flex items-center justify-between gap-4 text-sm">
                          <dt className="text-muted">Spent</dt>
                          <dd className="font-mono font-black text-warning">
                            {formatBudget(wallet.spentBudget)}
                          </dd>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-line pt-3 text-sm">
                          <dt className="font-extrabold text-foreground">Total</dt>
                          <dd className="font-mono font-black text-foreground">
                            {formatBudget(
                              wallet.availableBudget + wallet.reservedBudget + wallet.spentBudget,
                            )}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <ShieldCheck aria-hidden="true" className="size-5 text-success" />

                        <CardTitle>Wallet guarantees</CardTitle>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <ul className="space-y-3 text-sm leading-6 text-muted">
                        {[
                          'Overspending and negative balances are rejected.',
                          'Each purchase can only be recorded once.',
                          'Repeated requests use protected idempotency keys.',
                          'Ledger entries cannot be edited after creation.',
                        ].map((guarantee) => (
                          <li key={guarantee} className="flex items-start gap-2">
                            <CheckCircle2
                              aria-hidden="true"
                              className="mt-1 size-4 shrink-0 text-success"
                            />
                            <span>{guarantee}</span>
                          </li>
                        ))}
                      </ul>
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
