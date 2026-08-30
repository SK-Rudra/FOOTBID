import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildBudgetHistoryPath,
  buildWalletPath,
  getBudgetTransactions,
  getWallet,
  type BudgetTransactionHistory,
  type Wallet,
} from './wallet-api';

const wallet: Wallet = {
  participantId: 'participant-1',
  matchId: 'match-1',
  roomCode: 'P6WALLET1',
  matchStatus: 'AUCTION',
  startingBudget: 150_000_000,
  availableBudget: 108_000_000,
  reservedBudget: 7_000_000,
  spentBudget: 35_000_000,
  remainingBudget: 108_000_000,
  committedBudget: 42_000_000,
  budgetPerParticipant: 150_000_000,
  joinedAt: '2026-08-30T10:00:00.000Z',
  updatedAt: '2026-08-30T10:05:00.000Z',
};

const history: BudgetTransactionHistory = {
  data: [
    {
      id: 'transaction-1',
      participantId: wallet.participantId,
      auctionId: 'auction-1',
      type: 'PURCHASE',
      itemType: 'PLAYER',
      itemId: 'player-1',
      amount: 35_000_000,
      availableAfter: 108_000_000,
      reservedAfter: 7_000_000,
      spentAfter: 35_000_000,
      description: 'Player auction settlement.',
      createdAt: '2026-08-30T10:05:00.000Z',
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  },
  matchId: wallet.matchId,
  participantId: wallet.participantId,
};

describe('wallet API', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('builds encoded read-only wallet paths', () => {
    expect(buildWalletPath()).toBe('/api/v1/wallet');
    expect(buildWalletPath(' match 1 ')).toBe('/api/v1/wallet?matchId=match+1');

    expect(
      buildBudgetHistoryPath({
        matchId: ' match 1 ',
        type: 'PURCHASE',
        page: 2,
        pageSize: 10,
      }),
    ).toBe('/api/v1/wallet/transactions?matchId=match+1&type=PURCHASE&page=2&pageSize=10');
  });

  it('loads the authenticated wallet without a mutation request', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(wallet), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    await expect(getWallet('match-1')).resolves.toEqual(wallet);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/wallet\?matchId=match-1$/),
      expect.objectContaining({
        credentials: 'include',
      }),
    );

    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('method');
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('body');
  });

  it('loads filtered transaction history without exposing write operations', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(history), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    await expect(
      getBudgetTransactions({
        matchId: 'match-1',
        type: 'PURCHASE',
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual(history);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/v1\/wallet\/transactions\?matchId=match-1&type=PURCHASE&page=1&pageSize=20$/,
      ),
      expect.objectContaining({
        credentials: 'include',
      }),
    );

    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('method');
    expect(fetchMock.mock.calls[0]?.[1]).not.toHaveProperty('body');
  });
});
