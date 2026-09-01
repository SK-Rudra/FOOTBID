import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetsService } from '../budgets/budgets.service.js';
import {
  AuctionEventType,
  AuctionStatus,
  AuctionType,
  ContentTier,
  MatchStatus,
} from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuctionsService } from './auctions.service.js';

function createLifecycleMocks() {
  const dueAuctionFindMany = vi.fn();
  const auctionFindUnique = vi.fn();
  const auctionFindUniqueOrThrow = vi.fn();
  const auctionUpdateMany = vi.fn();

  const participantFindUnique = vi.fn();

  const bidFindUnique = vi.fn();
  const bidFindFirst = vi.fn();
  const bidCreate = vi.fn();

  const managerOwnershipFindUnique = vi.fn();
  const managerOwnershipCreate = vi.fn();
  const playerOwnershipCreate = vi.fn();

  const auctionEventFindFirst = vi.fn();
  const auctionEventCreate = vi.fn();

  const transactionClient = {
    auction: {
      findUnique: auctionFindUnique,
      findUniqueOrThrow: auctionFindUniqueOrThrow,
      updateMany: auctionUpdateMany,
    },
    matchParticipant: {
      findUnique: participantFindUnique,
    },
    bid: {
      findUnique: bidFindUnique,
      findFirst: bidFindFirst,
      create: bidCreate,
    },
    managerOwnership: {
      findUnique: managerOwnershipFindUnique,
      create: managerOwnershipCreate,
    },
    playerOwnership: {
      create: playerOwnershipCreate,
    },
    auctionEvent: {
      findFirst: auctionEventFindFirst,
      create: auctionEventCreate,
    },
  };

  const transaction = vi.fn(
    async (operation: (client: object) => Promise<unknown>): Promise<unknown> =>
      operation(transactionClient),
  );

  const prisma = {
    auction: {
      findMany: dueAuctionFindMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  const reserveFundsInTransaction = vi.fn();
  const releaseFundsInTransaction = vi.fn();
  const purchaseReservedFundsInTransaction = vi.fn();

  const budgetsService = {
    reserveFundsInTransaction,
    releaseFundsInTransaction,
    purchaseReservedFundsInTransaction,
  } as unknown as BudgetsService;

  return {
    service: new AuctionsService(prisma, budgetsService),
    transactionClient,
    dueAuctionFindMany,
    auctionFindUnique,
    auctionFindUniqueOrThrow,
    auctionUpdateMany,
    participantFindUnique,
    bidFindUnique,
    bidFindFirst,
    bidCreate,
    managerOwnershipFindUnique,
    managerOwnershipCreate,
    playerOwnershipCreate,
    auctionEventFindFirst,
    auctionEventCreate,
    reserveFundsInTransaction,
    releaseFundsInTransaction,
    purchaseReservedFundsInTransaction,
  };
}

const participant = {
  id: 'participant-1',
  userId: 'user-1',
  status: 'JOINED',
};

const participantSummary = {
  id: participant.id,
  userId: participant.userId,
  user: {
    username: 'bidder',
    displayName: 'Bidder One',
  },
};

const manager = {
  id: 'manager-1',
  fullName: 'Nayeem Rahman',
  nationalityCode: 'BD',
  tacticalStyle: 'High Press',
  preferredFormations: ['4-3-3', '4-4-2'],
  passingPhilosophy: 'Short Passing',
  defensivePhilosophy: 'Front Foot',
  pressingStyle: 'High Press',
  overall: 82,
  attacking: 84,
  defending: 78,
  adaptability: 81,
  manManagement: 83,
  attackingBonus: 3,
  midfieldBonus: 2,
  defendingBonus: 1,
  chemistryBonus: 2,
  marketValue: 12_000_000,
  tier: ContentTier.PREMIUM,
  club: {
    id: 'club-1',
    name: 'Dhaka Comets',
    shortName: 'COMETS',
  },
};

function managerAuctionRecord(
  status: AuctionStatus,
  endsAt: Date,
  highestBid: null | {
    amount: number;
    sequence: number;
    auctionVersion: number;
  } = null,
) {
  const bid = highestBid
    ? {
        id: 'bid-1',
        participantId: participant.id,
        amount: highestBid.amount,
        sequence: highestBid.sequence,
        auctionVersion: highestBid.auctionVersion,
        createdAt: new Date('2026-08-31T15:00:05.000Z'),
        participant: participantSummary,
      }
    : null;

  return {
    id: 'auction-1',
    matchId: 'match-1',
    playerId: null,
    managerId: manager.id,
    type: AuctionType.MANAGER,
    status,
    openingPrice: 5_000_000,
    currentPrice: highestBid?.amount ?? 5_000_000,
    minimumIncrement: 500_000,
    version: highestBid?.auctionVersion ?? 1,
    startsAt: new Date('2026-08-31T15:00:00.000Z'),
    endsAt,
    lastCallAt:
      status === AuctionStatus.LAST_CALL
        ? new Date('2026-08-31T15:00:20.000Z')
        : null,
    soldAt:
      status === AuctionStatus.SOLD
        ? new Date('2026-08-31T15:00:30.000Z')
        : null,
    createdAt: new Date('2026-08-31T14:59:00.000Z'),
    updatedAt: new Date('2026-08-31T15:00:30.000Z'),
    match: {
      roomCode: 'ROOM01',
      status: MatchStatus.AUCTION,
      createdById: 'host-1',
    },
    player: null,
    manager,
    nominatedByParticipant: {
      id: 'host-participant',
      userId: 'host-1',
      user: {
        username: 'host',
        displayName: 'Match Host',
      },
    },
    winnerParticipant:
      status === AuctionStatus.SOLD ? participantSummary : null,
    bids: bid ? [bid] : [],
    _count: {
      bids: bid ? 1 : 0,
    },
  };
}

describe('AuctionsService manager lifecycle', () => {
  let mocks: ReturnType<typeof createLifecycleMocks>;

  beforeEach(() => {
    mocks = createLifecycleMocks();
    mocks.participantFindUnique.mockResolvedValue(participant);
    mocks.bidFindUnique.mockResolvedValue(null);
    mocks.managerOwnershipFindUnique.mockResolvedValue(null);
    mocks.reserveFundsInTransaction.mockResolvedValue(undefined);
    mocks.releaseFundsInTransaction.mockResolvedValue(undefined);
    mocks.purchaseReservedFundsInTransaction.mockResolvedValue(undefined);
    mocks.auctionUpdateMany.mockResolvedValue({
      count: 1,
    });
    mocks.bidCreate.mockResolvedValue({
      id: 'bid-1',
    });
    mocks.auctionEventCreate.mockResolvedValue({
      id: 'event-1',
    });
    mocks.managerOwnershipCreate.mockResolvedValue({
      id: 'manager-ownership-1',
    });
  });

  it('rejects a new manager bid from a participant who owns a manager', async () => {
    const endsAt = new Date(Date.now() + 60_000);

    mocks.auctionFindUnique.mockResolvedValue({
      id: 'auction-1',
      matchId: 'match-1',
      playerId: null,
      managerId: manager.id,
      type: AuctionType.MANAGER,
      status: AuctionStatus.ACTIVE,
      openingPrice: 5_000_000,
      currentPrice: 5_000_000,
      minimumIncrement: 500_000,
      version: 1,
      endsAt,
      match: {
        status: MatchStatus.AUCTION,
      },
    });

    mocks.managerOwnershipFindUnique.mockResolvedValue({
      id: 'existing-manager-ownership',
    });

    await expect(
      mocks.service.placeBid('auction-1', participant.userId, {
        amount: 5_000_000,
        idempotencyKey: 'manager-bid-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.reserveFundsInTransaction).not.toHaveBeenCalled();
    expect(mocks.bidCreate).not.toHaveBeenCalled();
  });

  it('accepts a manager bid using the shared budget reservation', async () => {
    const endsAt = new Date(Date.now() + 60_000);

    mocks.auctionFindUnique.mockResolvedValue({
      id: 'auction-1',
      matchId: 'match-1',
      playerId: null,
      managerId: manager.id,
      type: AuctionType.MANAGER,
      status: AuctionStatus.ACTIVE,
      openingPrice: 5_000_000,
      currentPrice: 5_000_000,
      minimumIncrement: 500_000,
      version: 1,
      endsAt,
      match: {
        status: MatchStatus.AUCTION,
      },
    });

    mocks.bidFindFirst.mockResolvedValue(null);
    mocks.auctionEventFindFirst.mockResolvedValue({
      sequence: 1,
    });
    mocks.auctionFindUniqueOrThrow.mockResolvedValue(
      managerAuctionRecord(AuctionStatus.ACTIVE, endsAt, {
        amount: 5_000_000,
        sequence: 1,
        auctionVersion: 2,
      }),
    );

    const result = await mocks.service.placeBid(
      'auction-1',
      participant.userId,
      {
        amount: 5_000_000,
        idempotencyKey: 'manager-bid-1',
      },
    );

    expect(mocks.reserveFundsInTransaction).toHaveBeenCalledWith(
      mocks.transactionClient,
      {
        participantId: participant.id,
        auctionId: 'auction-1',
        amount: 5_000_000,
        idempotencyKey: 'auction:auction-1:bid:manager-bid-1:reserve',
        description: 'Reservation for bid 1.',
      },
    );

    expect(result).toMatchObject({
      eventType: AuctionEventType.BID_PLACED,
      replayed: false,
      auction: {
        managerId: manager.id,
        type: AuctionType.MANAGER,
        currentPrice: 5_000_000,
      },
    });
  });

  it('settles a manager purchase and ownership in one transaction', async () => {
    const now = new Date('2026-08-31T15:00:30.000Z');

    mocks.dueAuctionFindMany.mockResolvedValue([
      {
        id: 'auction-1',
      },
    ]);

    mocks.auctionFindUnique.mockResolvedValue({
      id: 'auction-1',
      matchId: 'match-1',
      playerId: null,
      managerId: manager.id,
      type: AuctionType.MANAGER,
      status: AuctionStatus.LAST_CALL,
      version: 2,
      endsAt: new Date('2026-08-31T15:00:29.000Z'),
    });

    mocks.bidFindFirst.mockResolvedValue({
      participantId: participant.id,
      amount: 7_000_000,
    });

    mocks.auctionEventFindFirst.mockResolvedValue({
      sequence: 3,
    });

    mocks.auctionFindUniqueOrThrow.mockResolvedValue(
      managerAuctionRecord(AuctionStatus.SOLD, now, {
        amount: 7_000_000,
        sequence: 1,
        auctionVersion: 3,
      }),
    );

    const results = await mocks.service.processDueAuctions(now);

    expect(mocks.purchaseReservedFundsInTransaction).toHaveBeenCalledWith(
      mocks.transactionClient,
      {
        participantId: participant.id,
        auctionId: 'auction-1',
        amount: 7_000_000,
        itemType: AuctionType.MANAGER,
        itemId: manager.id,
        idempotencyKey: 'auction:auction-1:purchase',
        description: 'Manager purchased through the auction.',
      },
    );

    expect(mocks.managerOwnershipCreate).toHaveBeenCalledWith({
      data: {
        matchId: 'match-1',
        participantId: participant.id,
        managerId: manager.id,
        auctionId: 'auction-1',
        acquisitionPrice: 7_000_000,
        acquiredAt: now,
      },
    });

    expect(mocks.playerOwnershipCreate).not.toHaveBeenCalled();

    expect(mocks.auctionEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        auctionId: 'auction-1',
        participantId: participant.id,
        type: AuctionEventType.SOLD,
        payload: {
          managerId: manager.id,
        },
      }),
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      eventType: AuctionEventType.SOLD,
      auction: {
        status: AuctionStatus.SOLD,
        managerId: manager.id,
      },
    });
  });
});
