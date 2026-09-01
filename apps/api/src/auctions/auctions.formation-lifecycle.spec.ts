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
  const auctionFindFirst = vi.fn();
  const auctionUpdateMany = vi.fn();

  const matchUpdate = vi.fn();
  const participantFindUnique = vi.fn();

  const bidFindUnique = vi.fn();
  const bidFindFirst = vi.fn();
  const bidCreate = vi.fn();

  const formationOwnershipFindUnique = vi.fn();
  const formationOwnershipCreate = vi.fn();
  const managerOwnershipCreate = vi.fn();
  const playerOwnershipCreate = vi.fn();

  const auctionEventFindFirst = vi.fn();
  const auctionEventCreate = vi.fn();

  const transactionClient = {
    auction: {
      findUnique: auctionFindUnique,
      findUniqueOrThrow: auctionFindUniqueOrThrow,
      findFirst: auctionFindFirst,
      updateMany: auctionUpdateMany,
    },
    match: {
      update: matchUpdate,
    },
    matchParticipant: {
      findUnique: participantFindUnique,
    },
    bid: {
      findUnique: bidFindUnique,
      findFirst: bidFindFirst,
      create: bidCreate,
    },
    formationOwnership: {
      findUnique: formationOwnershipFindUnique,
      create: formationOwnershipCreate,
    },
    managerOwnership: {
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
    auctionFindFirst,
    auctionUpdateMany,
    matchUpdate,
    participantFindUnique,
    bidFindUnique,
    bidFindFirst,
    bidCreate,
    formationOwnershipFindUnique,
    formationOwnershipCreate,
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

const formation = {
  id: 'formation-1',
  code: '4-3-3',
  name: 'Attacking 4-3-3',
  description: 'Wide attacking shape with coordinated pressing.',
  shape: {
    version: 1,
    slots: [],
  },
  buildUpStyle: 'Fast Build Up',
  attackingStyle: 'Wide',
  defensiveStyle: 'Front Foot',
  width: 68,
  tempo: 72,
  pressingIntensity: 70,
  attackingBonus: 2,
  midfieldBonus: 1,
  defendingBonus: 0,
  chemistryBonus: 1,
  marketValue: 10_000_000,
  tier: ContentTier.PREMIUM,
  isNeutral: false,
};

function formationAuctionRecord(
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
        createdAt: new Date('2026-09-01T03:00:05.000Z'),
        participant: participantSummary,
      }
    : null;

  return {
    id: 'auction-1',
    matchId: 'match-1',
    playerId: null,
    managerId: null,
    formationId: formation.id,
    type: AuctionType.FORMATION,
    status,
    openingPrice: 8_000_000,
    currentPrice: highestBid?.amount ?? 8_000_000,
    minimumIncrement: 500_000,
    version: highestBid?.auctionVersion ?? 1,
    startsAt: new Date('2026-09-01T03:00:00.000Z'),
    endsAt,
    lastCallAt:
      status === AuctionStatus.LAST_CALL
        ? new Date('2026-09-01T03:00:20.000Z')
        : null,
    soldAt:
      status === AuctionStatus.SOLD
        ? new Date('2026-09-01T03:00:30.000Z')
        : null,
    createdAt: new Date('2026-09-01T02:59:00.000Z'),
    updatedAt: new Date('2026-09-01T03:00:30.000Z'),
    match: {
      roomCode: 'ROOM01',
      status: MatchStatus.AUCTION,
      createdById: participant.userId,
    },
    player: null,
    manager: null,
    formation,
    nominatedByParticipant: participantSummary,
    winnerParticipant:
      status === AuctionStatus.SOLD ? participantSummary : null,
    bids: bid ? [bid] : [],
    _count: {
      bids: bid ? 1 : 0,
    },
  };
}

describe('AuctionsService formation lifecycle', () => {
  let mocks: ReturnType<typeof createLifecycleMocks>;

  beforeEach(() => {
    mocks = createLifecycleMocks();
    mocks.participantFindUnique.mockResolvedValue(participant);
    mocks.bidFindUnique.mockResolvedValue(null);
    mocks.auctionFindFirst.mockResolvedValue(null);
    mocks.formationOwnershipFindUnique.mockResolvedValue(null);
    mocks.reserveFundsInTransaction.mockResolvedValue(undefined);
    mocks.releaseFundsInTransaction.mockResolvedValue(undefined);
    mocks.purchaseReservedFundsInTransaction.mockResolvedValue(undefined);
    mocks.auctionUpdateMany.mockResolvedValue({
      count: 1,
    });
    mocks.matchUpdate.mockResolvedValue({
      id: 'match-1',
    });
    mocks.bidCreate.mockResolvedValue({
      id: 'bid-1',
    });
    mocks.auctionEventCreate.mockResolvedValue({
      id: 'event-1',
    });
    mocks.formationOwnershipCreate.mockResolvedValue({
      id: 'formation-ownership-1',
    });
  });

  it('starts a waiting formation auction', async () => {
    const endsAt = new Date(Date.now() + 30_000);

    mocks.auctionFindUnique.mockResolvedValue({
      id: 'auction-1',
      matchId: 'match-1',
      type: AuctionType.FORMATION,
      status: AuctionStatus.WAITING,
      version: 0,
      match: {
        createdById: participant.userId,
        status: MatchStatus.WAITING,
      },
    });

    mocks.auctionEventFindFirst.mockResolvedValue({
      sequence: 1,
    });

    mocks.auctionFindUniqueOrThrow.mockResolvedValue(
      formationAuctionRecord(AuctionStatus.ACTIVE, endsAt),
    );

    const result = await mocks.service.startAuction(
      'auction-1',
      participant.userId,
      {
        durationSeconds: 30,
      },
    );

    expect(mocks.auctionUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'auction-1',
          status: AuctionStatus.WAITING,
          version: 0,
        },
        data: expect.objectContaining({
          status: AuctionStatus.ACTIVE,
          version: 1,
        }),
      }),
    );

    expect(result).toMatchObject({
      eventType: AuctionEventType.STARTED,
      replayed: false,
      auction: {
        formationId: formation.id,
        type: AuctionType.FORMATION,
        status: AuctionStatus.ACTIVE,
      },
    });
  });

  it('rejects a formation bid from a participant who owns a formation', async () => {
    const endsAt = new Date(Date.now() + 60_000);

    mocks.auctionFindUnique.mockResolvedValue({
      id: 'auction-1',
      matchId: 'match-1',
      playerId: null,
      managerId: null,
      formationId: formation.id,
      type: AuctionType.FORMATION,
      status: AuctionStatus.ACTIVE,
      openingPrice: 8_000_000,
      currentPrice: 8_000_000,
      minimumIncrement: 500_000,
      version: 1,
      endsAt,
      match: {
        status: MatchStatus.AUCTION,
      },
    });

    mocks.formationOwnershipFindUnique.mockResolvedValue({
      id: 'existing-formation-ownership',
    });

    await expect(
      mocks.service.placeBid('auction-1', participant.userId, {
        amount: 8_000_000,
        idempotencyKey: 'formation-bid-1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.reserveFundsInTransaction).not.toHaveBeenCalled();
    expect(mocks.bidCreate).not.toHaveBeenCalled();
  });

  it('accepts a formation bid using the shared budget reservation', async () => {
    const endsAt = new Date(Date.now() + 60_000);

    mocks.auctionFindUnique.mockResolvedValue({
      id: 'auction-1',
      matchId: 'match-1',
      playerId: null,
      managerId: null,
      formationId: formation.id,
      type: AuctionType.FORMATION,
      status: AuctionStatus.ACTIVE,
      openingPrice: 8_000_000,
      currentPrice: 8_000_000,
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
      formationAuctionRecord(AuctionStatus.ACTIVE, endsAt, {
        amount: 8_000_000,
        sequence: 1,
        auctionVersion: 2,
      }),
    );

    const result = await mocks.service.placeBid(
      'auction-1',
      participant.userId,
      {
        amount: 8_000_000,
        idempotencyKey: 'formation-bid-1',
      },
    );

    expect(mocks.reserveFundsInTransaction).toHaveBeenCalledWith(
      mocks.transactionClient,
      {
        participantId: participant.id,
        auctionId: 'auction-1',
        amount: 8_000_000,
        idempotencyKey: 'auction:auction-1:bid:formation-bid-1:reserve',
        description: 'Reservation for bid 1.',
      },
    );

    expect(result).toMatchObject({
      eventType: AuctionEventType.BID_PLACED,
      replayed: false,
      auction: {
        formationId: formation.id,
        type: AuctionType.FORMATION,
        currentPrice: 8_000_000,
      },
    });
  });

  it('settles a formation purchase and ownership atomically', async () => {
    const now = new Date('2026-09-01T03:00:30.000Z');

    mocks.dueAuctionFindMany.mockResolvedValue([
      {
        id: 'auction-1',
      },
    ]);

    mocks.auctionFindUnique.mockResolvedValue({
      id: 'auction-1',
      matchId: 'match-1',
      playerId: null,
      managerId: null,
      formationId: formation.id,
      type: AuctionType.FORMATION,
      status: AuctionStatus.LAST_CALL,
      version: 2,
      endsAt: new Date('2026-09-01T03:00:29.000Z'),
    });

    mocks.bidFindFirst.mockResolvedValue({
      participantId: participant.id,
      amount: 9_000_000,
    });

    mocks.auctionEventFindFirst.mockResolvedValue({
      sequence: 3,
    });

    mocks.auctionFindUniqueOrThrow.mockResolvedValue(
      formationAuctionRecord(AuctionStatus.SOLD, now, {
        amount: 9_000_000,
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
        amount: 9_000_000,
        itemType: AuctionType.FORMATION,
        itemId: formation.id,
        idempotencyKey: 'auction:auction-1:purchase',
        description: 'Formation purchased through the auction.',
      },
    );

    expect(mocks.formationOwnershipCreate).toHaveBeenCalledWith({
      data: {
        matchId: 'match-1',
        participantId: participant.id,
        formationId: formation.id,
        auctionId: 'auction-1',
        acquisitionPrice: 9_000_000,
        acquiredAt: now,
      },
    });

    expect(mocks.managerOwnershipCreate).not.toHaveBeenCalled();
    expect(mocks.playerOwnershipCreate).not.toHaveBeenCalled();

    expect(mocks.auctionEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        auctionId: 'auction-1',
        participantId: participant.id,
        type: AuctionEventType.SOLD,
        payload: {
          formationId: formation.id,
        },
      }),
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      eventType: AuctionEventType.SOLD,
      auction: {
        status: AuctionStatus.SOLD,
        formationId: formation.id,
      },
    });
  });
});
