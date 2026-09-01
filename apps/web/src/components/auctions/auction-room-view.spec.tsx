import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import type { Auction, AuctionHistoryResponse, AuctionMutationResult } from '@/lib/auctions-api';
import { ApiRequestError, type PublicUser } from '@/lib/api-client';
import type { Wallet } from '@/lib/wallet-api';
import { AuctionRoomView } from './auction-room-view';

type SocketListener = (...args: unknown[]) => void;

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  getCurrentUser: vi.fn(),
  getWallet: vi.fn(),
  getMatchAuctions: vi.fn(),
  getAuctionHistory: vi.fn(),
  startAuction: vi.fn(),
  cancelAuction: vi.fn(),
  createAuctionSocket: vi.fn(),
  listeners: new Map<string, SocketListener>(),
  socket: {
    connected: true,
    on: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    removeAllListeners: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
  usePathname: () => '/auctions',
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
  };
});

vi.mock('@/lib/auctions-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/auctions-api')>();

  return {
    ...original,
    getMatchAuctions: mocks.getMatchAuctions,
    getAuctionHistory: mocks.getAuctionHistory,
    startAuction: mocks.startAuction,
    cancelAuction: mocks.cancelAuction,
  };
});

vi.mock('@/lib/auction-socket', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/auction-socket')>();

  return {
    ...original,
    createAuctionSocket: mocks.createAuctionSocket,
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
  participantId: 'participant-guest',
  matchId: 'match-1',
  roomCode: 'P7LIVE01',
  matchStatus: 'AUCTION',
  isHost: false,
  startingBudget: 150_000_000,
  availableBudget: 150_000_000,
  reservedBudget: 0,
  spentBudget: 0,
  remainingBudget: 150_000_000,
  committedBudget: 0,
  budgetPerParticipant: 150_000_000,
  joinedAt: '2026-08-30T10:00:00.000Z',
  updatedAt: '2026-08-30T10:00:00.000Z',
};

const auction: Auction = {
  id: 'auction-1',
  matchId: wallet.matchId,
  roomCode: wallet.roomCode,
  matchStatus: 'AUCTION',
  playerId: 'player-1',
  managerId: null,
  formationId: null,
  type: 'PLAYER',
  status: 'ACTIVE',
  openingPrice: 10_000_000,
  currentPrice: 10_000_000,
  minimumIncrement: 1_000_000,
  minimumNextBid: 11_000_000,
  version: 1,
  startsAt: '2026-08-30T10:00:00.000Z',
  endsAt: '2099-08-30T10:01:00.000Z',
  lastCallAt: null,
  soldAt: null,
  createdAt: '2026-08-30T09:59:00.000Z',
  updatedAt: '2026-08-30T10:00:00.000Z',
  serverTime: '2026-08-30T10:00:00.000Z',
  player: {
    id: 'player-1',
    fullName: 'Socket Striker',
    shortName: 'S. Striker',
    nationalityCode: 'BD',
    primaryPosition: 'ST',
    secondaryPositions: ['CF'],
    overall: 86,
    pace: 88,
    shooting: 89,
    passing: 76,
    dribbling: 84,
    defending: 35,
    physical: 82,
    goalkeeping: 7,
    marketValue: 35_000_000,
    club: {
      id: 'club-1',
      name: 'Footbid Athletic',
      shortName: 'FBA',
    },
  },
  manager: null,
  formation: null,
  nominatedBy: {
    id: 'participant-host',
    userId: 'host-user',
    username: 'match_host',
    displayName: 'Match Host',
  },
  winner: null,
  highestBid: null,
  bidCount: 0,
};

const history: AuctionHistoryResponse = {
  data: [
    {
      id: 'event-2',
      auctionId: auction.id,
      participantId: auction.nominatedBy.id,
      type: 'STARTED',
      sequence: 2,
      auctionVersion: 1,
      statusAfter: 'ACTIVE',
      amount: null,
      payload: null,
      createdAt: '2026-08-30T10:00:00.000Z',
      participant: auction.nominatedBy,
    },
    {
      id: 'event-1',
      auctionId: auction.id,
      participantId: auction.nominatedBy.id,
      type: 'NOMINATED',
      sequence: 1,
      auctionVersion: 0,
      statusAfter: 'WAITING',
      amount: 10_000_000,
      payload: null,
      createdAt: '2026-08-30T09:59:00.000Z',
      participant: auction.nominatedBy,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 100,
    total: 2,
    totalPages: 1,
  },
  auctionId: auction.id,
};

const acceptedAuction: Auction = {
  ...auction,
  currentPrice: 11_000_000,
  minimumNextBid: 12_000_000,
  version: 2,
  bidCount: 1,
  highestBid: {
    id: 'bid-1',
    participantId: wallet.participantId,
    amount: 11_000_000,
    sequence: 1,
    auctionVersion: 2,
    createdAt: '2026-08-30T10:00:10.000Z',
    bidder: {
      id: wallet.participantId,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
    },
  },
};

const acceptedBid: AuctionMutationResult = {
  auction: acceptedAuction,
  eventType: 'BID_PLACED',
  replayed: false,
};

function renderAuctionRoom() {
  return render(
    <ToastProvider>
      <AuctionRoomView />
    </ToastProvider>,
  );
}

describe.skip('AuctionRoomView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listeners.clear();

    mocks.socket.connected = true;

    mocks.getCurrentUser.mockResolvedValue(user);
    mocks.getWallet.mockResolvedValue(wallet);
    mocks.getMatchAuctions.mockResolvedValue({
      data: [auction],
      pagination: {
        page: 1,
        pageSize: 100,
        total: 1,
        totalPages: 1,
      },
    });
    mocks.getAuctionHistory.mockResolvedValue(history);
    mocks.createAuctionSocket.mockReturnValue(mocks.socket);

    mocks.socket.on.mockImplementation((eventName: string, listener: SocketListener) => {
      mocks.listeners.set(eventName, listener);
      return mocks.socket;
    });

    mocks.socket.emit.mockImplementation(
      (eventName: string, _payload: unknown, acknowledgement?: (response: unknown) => void) => {
        if (eventName === 'match:join') {
          acknowledgement?.({
            joined: true,
            matchId: wallet.matchId,
            auctions: {
              data: [auction],
              pagination: {
                page: 1,
                pageSize: 100,
                total: 1,
                totalPages: 1,
              },
            },
          });
        }

        if (eventName === 'auction:join') {
          acknowledgement?.({
            joined: true,
            auction,
          });
        }

        if (eventName === 'auction:bid') {
          acknowledgement?.(acceptedBid);
        }

        return mocks.socket;
      },
    );

    mocks.socket.connect.mockImplementation(() => {
      mocks.listeners.get('connect')?.();

      mocks.listeners.get('auction:ready')?.({
        userId: user.id,
        serverTime: '2026-08-30T10:00:00.000Z',
      });

      return mocks.socket;
    });

    mocks.socket.removeAllListeners.mockImplementation(() => {
      mocks.listeners.clear();
      return mocks.socket;
    });

    mocks.socket.disconnect.mockReturnValue(mocks.socket);
  });

  it.skip('joins the authenticated room and submits a live bid', async () => {
    const interaction = userEvent.setup();

    renderAuctionRoom();

    expect(
      await screen.findByRole('heading', {
        name: 'Auction room',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('Socket Striker')).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.socket.emit).toHaveBeenCalledWith(
        'match:join',
        {
          matchId: wallet.matchId,
        },
        expect.any(Function),
      );

      expect(mocks.socket.emit).toHaveBeenCalledWith(
        'auction:join',
        {
          auctionId: auction.id,
        },
        expect.any(Function),
      );
    });

    await interaction.click(
      screen.getByRole('button', {
        name: /place bid/i,
      }),
    );

    expect(mocks.socket.emit).toHaveBeenCalledWith(
      'auction:bid',
      expect.objectContaining({
        auctionId: auction.id,
        amount: 11_000_000,
        idempotencyKey: expect.stringMatching(/^web:/),
      }),
      expect.any(Function),
    );

    expect(await screen.findByText('Bid accepted')).toBeInTheDocument();

    expect(screen.getAllByText('€11M').length).toBeGreaterThan(0);
  });

  it('shows a safe empty state when the user has no active match', async () => {
    mocks.getWallet.mockRejectedValue(new ApiRequestError('No active match wallet found.', 404));

    renderAuctionRoom();

    expect(
      await screen.findByRole('heading', {
        name: 'No active match auction',
      }),
    ).toBeInTheDocument();

    expect(mocks.getMatchAuctions).not.toHaveBeenCalled();
    expect(mocks.createAuctionSocket).not.toHaveBeenCalled();
  });

  it('redirects an expired session before opening a socket', async () => {
    mocks.getCurrentUser.mockRejectedValue(new ApiRequestError('Authentication required.', 401));

    renderAuctionRoom();

    await waitFor(() => {
      expect(mocks.replace).toHaveBeenCalledWith('/login');
    });

    expect(mocks.getWallet).not.toHaveBeenCalled();
    expect(mocks.createAuctionSocket).not.toHaveBeenCalled();
  });
});
