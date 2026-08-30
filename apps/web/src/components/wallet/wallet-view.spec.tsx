import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, type PublicUser } from '@/lib/api-client';
import type { BudgetTransactionHistory, Wallet } from '@/lib/wallet-api';
import { WalletView } from './wallet-view';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  getCurrentUser: vi.fn(),
  getWallet: vi.fn(),
  getBudgetTransactions: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
  usePathname: () => '/wallet',
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api-client')>();

  return {
    ...original,
    getCurrentUser: mocks.getCurrentUser,
  };
});

vi.mock('@/lib/wallet-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/wallet-api')>();

  return {
    ...original,
    getWallet: mocks.getWallet,
    getBudgetTransactions: mocks.getBudgetTransactions,
  };
});

const user: PublicUser = {
  id: 'user-1',
  email: 'manager@footbid.test',
  username: 'manager_one',
  displayName: 'Manager One',
  avatarUrl: null,
  role: 'USER',
  status: 'ACTIVE',
  lastSeenAt: null,
  createdAt: '2026-08-30T10:00:00.000Z',
  updatedAt: '2026-08-30T10:00:00.000Z',
};

const wallet: Wallet = {
  participantId: 'participant-1',
  matchId: 'match-1',
  roomCode: 'P6WALLET1',
  matchStatus: 'AUCTION',
  isHost: true,
  startingBudget: 150_000_000,
  availableBudget: 115_000_000,
  reservedBudget: 0,
  spentBudget: 35_000_000,
  remainingBudget: 115_000_000,
  committedBudget: 35_000_000,
  budgetPerParticipant: 150_000_000,
  joinedAt: '2026-08-30T10:00:00.000Z',
  updatedAt: '2026-08-30T10:05:00.000Z',
};

const history: BudgetTransactionHistory = {
  data: [
    {
      id: 'transaction-2',
      participantId: wallet.participantId,
      auctionId: 'auction-1',
      type: 'PURCHASE',
      itemType: 'PLAYER',
      itemId: 'phase6-player-01',
      amount: 35_000_000,
      availableAfter: 115_000_000,
      reservedAfter: 0,
      spentAfter: 35_000_000,
      description: 'Player auction settlement.',
      createdAt: '2026-08-30T10:05:00.000Z',
    },
    {
      id: 'transaction-1',
      participantId: wallet.participantId,
      auctionId: 'auction-1',
      type: 'RESERVATION',
      itemType: null,
      itemId: null,
      amount: 35_000_000,
      availableAfter: 115_000_000,
      reservedAfter: 35_000_000,
      spentAfter: 0,
      description: 'Winning bid reserved.',
      createdAt: '2026-08-30T10:04:00.000Z',
    },
  ],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 2,
    totalPages: 1,
  },
  matchId: wallet.matchId,
  participantId: wallet.participantId,
};

describe('WalletView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.getWallet.mockResolvedValue(wallet);
    mocks.getBudgetTransactions.mockResolvedValue(history);
  });

  it('shows the server-controlled wallet and filters immutable history', async () => {
    const interaction = userEvent.setup();

    render(<WalletView />);

    expect(
      await screen.findByRole('heading', {
        name: 'Match wallet',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('P6WALLET1')).toBeInTheDocument();
    expect(screen.getAllByText('€115M').length).toBeGreaterThan(0);
    expect(screen.getAllByText('€35M').length).toBeGreaterThan(0);

    expect(screen.getByText('Player auction settlement.')).toBeInTheDocument();

    expect(screen.getByText('Winning bid reserved.')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', {
        name: 'Every euro is accounted for',
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('button', {
        name: /reserve|purchase|change balance/i,
      }),
    ).not.toBeInTheDocument();

    await interaction.selectOptions(
      screen.getByRole('combobox', {
        name: 'Filter transaction history',
      }),
      'PURCHASE',
    );

    expect(screen.getByText('Player auction settlement.')).toBeInTheDocument();

    expect(screen.queryByText('Winning bid reserved.')).not.toBeInTheDocument();

    expect(mocks.getBudgetTransactions).toHaveBeenCalledWith(
      {
        matchId: wallet.matchId,
        page: 1,
        pageSize: 100,
      },
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('shows a safe empty state when the user has no active match', async () => {
    mocks.getWallet.mockRejectedValue(new ApiRequestError('No active match wallet found.', 404));

    render(<WalletView />);

    expect(
      await screen.findByRole('heading', {
        name: 'No active match wallet',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/created automatically when you join a match/i)).toBeInTheDocument();

    expect(mocks.getBudgetTransactions).not.toHaveBeenCalled();
  });

  it('redirects expired unauthenticated sessions to sign in', async () => {
    mocks.getCurrentUser.mockRejectedValue(new ApiRequestError('Authentication required.', 401));

    render(<WalletView />);

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/login');
    });

    expect(mocks.getWallet).not.toHaveBeenCalled();
    expect(mocks.getBudgetTransactions).not.toHaveBeenCalled();
  });
});
