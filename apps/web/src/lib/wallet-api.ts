import { apiRequest } from './api-client';

export const BUDGET_TRANSACTION_TYPES = ['RESERVATION', 'RELEASE', 'PURCHASE', 'REFUND'] as const;

export type BudgetTransactionType = (typeof BUDGET_TRANSACTION_TYPES)[number];

export type WalletMatchStatus =
  'WAITING' | 'AUCTION' | 'SQUAD_BUILDING' | 'READY' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type WalletItemType = 'PLAYER' | 'MANAGER' | 'FORMATION';

export interface Wallet {
  participantId: string;
  matchId: string;
  roomCode: string;
  matchStatus: WalletMatchStatus;
  isHost: boolean;
  startingBudget: number;
  availableBudget: number;
  reservedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  committedBudget: number;
  budgetPerParticipant: number;
  joinedAt: string;
  updatedAt: string;
}

export interface BudgetTransaction {
  id: string;
  participantId: string;
  auctionId: string | null;
  type: BudgetTransactionType;
  itemType: WalletItemType | null;
  itemId: string | null;
  amount: number;
  availableAfter: number;
  reservedAfter: number;
  spentAfter: number;
  description: string | null;
  createdAt: string;
}

export interface BudgetTransactionHistory {
  data: BudgetTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  matchId: string;
  participantId: string;
}

export interface BudgetHistoryQuery {
  matchId?: string;
  type?: BudgetTransactionType;
  page?: number;
  pageSize?: number;
}

function appendQueryValue(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value === undefined || value === '') {
    return;
  }

  params.set(key, String(value));
}

function pathWithQuery(path: string, values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    appendQueryValue(params, key, value);
  }

  const queryString = params.toString();

  return queryString ? `${path}?${queryString}` : path;
}

export function buildWalletPath(matchId?: string): string {
  return pathWithQuery('/api/v1/wallet', {
    matchId: matchId?.trim(),
  });
}

export function buildBudgetHistoryPath(query: BudgetHistoryQuery = {}): string {
  return pathWithQuery('/api/v1/wallet/transactions', {
    matchId: query.matchId?.trim(),
    type: query.type,
    page: query.page,
    pageSize: query.pageSize,
  });
}

export function getWallet(matchId?: string, init: RequestInit = {}): Promise<Wallet> {
  return apiRequest<Wallet>(buildWalletPath(matchId), init);
}

export function getBudgetTransactions(
  query: BudgetHistoryQuery = {},
  init: RequestInit = {},
): Promise<BudgetTransactionHistory> {
  return apiRequest<BudgetTransactionHistory>(buildBudgetHistoryPath(query), init);
}
