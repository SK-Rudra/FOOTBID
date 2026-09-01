import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetsService } from '../budgets/budgets.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  AuctionStatus,
  AuctionType,
  MatchStatus,
} from '../generated/prisma/enums.js';
import { AuctionsService } from './auctions.service.js';
import type { CreateManagerAuctionDto } from './dto/create-manager-auction.dto.js';

function createTransactionMock() {
  const matchFindUnique = vi.fn();
  const participantFindUnique = vi.fn();
  const managerFindFirst = vi.fn();
  const managerOwnershipFindUnique = vi.fn();
  const auctionFindFirst = vi.fn();
  const auctionCreate = vi.fn();
  const auctionFindUniqueOrThrow = vi.fn();
  const auctionEventCreate = vi.fn();

  const client = {
    match: {
      findUnique: matchFindUnique,
    },
    matchParticipant: {
      findUnique: participantFindUnique,
    },
    manager: {
      findFirst: managerFindFirst,
    },
    managerOwnership: {
      findUnique: managerOwnershipFindUnique,
    },
    auction: {
      findFirst: auctionFindFirst,
      create: auctionCreate,
      findUniqueOrThrow: auctionFindUniqueOrThrow,
    },
    auctionEvent: {
      create: auctionEventCreate,
    },
  };

  return {
    client,
    matchFindUnique,
    participantFindUnique,
    managerFindFirst,
    managerOwnershipFindUnique,
    auctionFindFirst,
    auctionCreate,
    auctionFindUniqueOrThrow,
    auctionEventCreate,
  };
}

function createService(transactionClient: object) {
  const transaction = vi.fn(
    async (operation: (client: object) => Promise<unknown>): Promise<unknown> =>
      operation(transactionClient),
  );

  const prisma = {
    $transaction: transaction,
  } as unknown as PrismaService;

  const budgetsService = {} as BudgetsService;

  return {
    service: new AuctionsService(prisma, budgetsService),
    transaction,
  };
}

const dto: CreateManagerAuctionDto = {
  managerId: 'manager-1',
  openingPrice: 5_000_000,
  minimumIncrement: 500_000,
};

const participant = {
  id: 'participant-1',
  userId: 'host-1',
  status: 'JOINED',
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
  tier: 'PREMIUM',
  club: {
    id: 'club-1',
    name: 'Dhaka Comets',
    shortName: 'COMETS',
  },
};

function createdAuctionRecord() {
  const now = new Date('2026-08-31T15:00:00.000Z');

  return {
    id: 'auction-1',
    matchId: 'match-1',
    playerId: null,
    managerId: manager.id,
    type: AuctionType.MANAGER,
    status: AuctionStatus.WAITING,
    openingPrice: dto.openingPrice,
    currentPrice: dto.openingPrice,
    minimumIncrement: dto.minimumIncrement,
    version: 0,
    startsAt: null,
    endsAt: null,
    lastCallAt: null,
    soldAt: null,
    createdAt: now,
    updatedAt: now,
    match: {
      roomCode: 'ROOM01',
      status: MatchStatus.WAITING,
      createdById: 'host-1',
    },
    player: null,
    manager,
    nominatedByParticipant: {
      id: participant.id,
      userId: participant.userId,
      user: {
        username: 'host',
        displayName: 'Match Host',
      },
    },
    winnerParticipant: null,
    bids: [],
    _count: {
      bids: 0,
    },
  };
}

describe('AuctionsService manager creation', () => {
  let transactionMock: ReturnType<typeof createTransactionMock>;
  let service: AuctionsService;

  beforeEach(() => {
    transactionMock = createTransactionMock();

    transactionMock.matchFindUnique.mockResolvedValue({
      id: 'match-1',
      createdById: 'host-1',
      status: MatchStatus.WAITING,
    });
    transactionMock.participantFindUnique.mockResolvedValue(participant);
    transactionMock.managerFindFirst.mockResolvedValue({
      id: manager.id,
    });
    transactionMock.managerOwnershipFindUnique.mockResolvedValue(null);
    transactionMock.auctionFindFirst.mockResolvedValue(null);
    transactionMock.auctionCreate.mockResolvedValue({
      id: 'auction-1',
    });
    transactionMock.auctionEventCreate.mockResolvedValue({
      id: 'event-1',
    });
    transactionMock.auctionFindUniqueOrThrow.mockResolvedValue(
      createdAuctionRecord(),
    );

    service = createService(transactionMock.client).service;
  });

  it('creates a waiting manager auction and nomination event', async () => {
    const result = await service.createManagerAuction('match-1', 'host-1', dto);

    expect(transactionMock.managerFindFirst).toHaveBeenCalledWith({
      where: {
        id: manager.id,
        isActive: true,
        isNeutral: false,
      },
      select: {
        id: true,
      },
    });

    expect(transactionMock.auctionCreate).toHaveBeenCalledWith({
      data: {
        matchId: 'match-1',
        managerId: manager.id,
        nominatedByParticipantId: participant.id,
        type: AuctionType.MANAGER,
        status: AuctionStatus.WAITING,
        openingPrice: dto.openingPrice,
        currentPrice: dto.openingPrice,
        minimumIncrement: dto.minimumIncrement,
        version: 0,
      },
      select: {
        id: true,
      },
    });

    expect(transactionMock.auctionEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        auctionId: 'auction-1',
        participantId: participant.id,
        type: 'NOMINATED',
        payload: {
          managerId: manager.id,
          minimumIncrement: dto.minimumIncrement,
        },
      }),
    });

    expect(result).toMatchObject({
      eventType: 'NOMINATED',
      replayed: false,
      auction: {
        id: 'auction-1',
        playerId: null,
        managerId: manager.id,
        type: AuctionType.MANAGER,
        manager: {
          id: manager.id,
          fullName: manager.fullName,
        },
      },
    });
  });

  it('allows only the match host to nominate a manager', async () => {
    transactionMock.matchFindUnique.mockResolvedValue({
      id: 'match-1',
      createdById: 'different-user',
      status: MatchStatus.WAITING,
    });

    await expect(
      service.createManagerAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(transactionMock.managerFindFirst).not.toHaveBeenCalled();
  });

  it('rejects inactive, neutral, or missing managers', async () => {
    transactionMock.managerFindFirst.mockResolvedValue(null);

    await expect(
      service.createManagerAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transactionMock.auctionCreate).not.toHaveBeenCalled();
  });

  it('rejects a manager already owned in the match', async () => {
    transactionMock.managerOwnershipFindUnique.mockResolvedValue({
      id: 'ownership-1',
    });

    await expect(
      service.createManagerAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactionMock.auctionCreate).not.toHaveBeenCalled();
  });

  it('rejects creation while another auction is unfinished', async () => {
    transactionMock.auctionFindFirst.mockResolvedValue({
      id: 'open-auction',
    });

    await expect(
      service.createManagerAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactionMock.auctionCreate).not.toHaveBeenCalled();
  });
});
