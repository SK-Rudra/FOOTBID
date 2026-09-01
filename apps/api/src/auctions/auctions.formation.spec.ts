import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetsService } from '../budgets/budgets.service.js';
import {
  AuctionStatus,
  AuctionType,
  MatchStatus,
} from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AuctionsService } from './auctions.service.js';
import type { CreateFormationAuctionDto } from './dto/create-formation-auction.dto.js';

function createTransactionMock() {
  const matchFindUnique = vi.fn();
  const participantFindUnique = vi.fn();
  const formationFindFirst = vi.fn();
  const formationOwnershipFindUnique = vi.fn();
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
    formation: {
      findFirst: formationFindFirst,
    },
    formationOwnership: {
      findUnique: formationOwnershipFindUnique,
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
    formationFindFirst,
    formationOwnershipFindUnique,
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

const dto: CreateFormationAuctionDto = {
  formationId: 'formation-1',
  openingPrice: 8_000_000,
  minimumIncrement: 500_000,
};

const participant = {
  id: 'participant-1',
  userId: 'host-1',
  status: 'JOINED',
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
  tier: 'PREMIUM',
  isNeutral: false,
};

function createdAuctionRecord() {
  const now = new Date('2026-09-01T03:00:00.000Z');

  return {
    id: 'auction-1',
    matchId: 'match-1',
    playerId: null,
    managerId: null,
    formationId: formation.id,
    type: AuctionType.FORMATION,
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
    manager: null,
    formation,
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

describe('AuctionsService formation creation', () => {
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
    transactionMock.formationFindFirst.mockResolvedValue({
      id: formation.id,
    });
    transactionMock.formationOwnershipFindUnique.mockResolvedValue(null);
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

  it('creates a waiting formation auction and nomination event', async () => {
    const result = await service.createFormationAuction(
      'match-1',
      'host-1',
      dto,
    );

    expect(transactionMock.formationFindFirst).toHaveBeenCalledWith({
      where: {
        id: formation.id,
        isActive: true,
        isNeutral: false,
      },
      select: {
        id: true,
      },
    });

    expect(transactionMock.formationOwnershipFindUnique).toHaveBeenCalledWith({
      where: {
        matchId_formationId: {
          matchId: 'match-1',
          formationId: formation.id,
        },
      },
      select: {
        id: true,
      },
    });

    expect(transactionMock.auctionCreate).toHaveBeenCalledWith({
      data: {
        matchId: 'match-1',
        formationId: formation.id,
        nominatedByParticipantId: participant.id,
        type: AuctionType.FORMATION,
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
          formationId: formation.id,
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
        managerId: null,
        formationId: formation.id,
        type: AuctionType.FORMATION,
        formation: {
          id: formation.id,
          code: formation.code,
          name: formation.name,
        },
      },
    });
  });

  it('allows only the match host to nominate a formation', async () => {
    transactionMock.matchFindUnique.mockResolvedValue({
      id: 'match-1',
      createdById: 'different-user',
      status: MatchStatus.WAITING,
    });

    await expect(
      service.createFormationAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(transactionMock.formationFindFirst).not.toHaveBeenCalled();
  });

  it('rejects inactive, neutral, or missing formations', async () => {
    transactionMock.formationFindFirst.mockResolvedValue(null);

    await expect(
      service.createFormationAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(transactionMock.auctionCreate).not.toHaveBeenCalled();
  });

  it('rejects a formation already owned in the match', async () => {
    transactionMock.formationOwnershipFindUnique.mockResolvedValue({
      id: 'ownership-1',
    });

    await expect(
      service.createFormationAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactionMock.auctionCreate).not.toHaveBeenCalled();
  });

  it('rejects creation while another auction is unfinished', async () => {
    transactionMock.auctionFindFirst.mockResolvedValue({
      id: 'open-auction',
    });

    await expect(
      service.createFormationAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(transactionMock.auctionCreate).not.toHaveBeenCalled();
  });

  it('maps a database uniqueness race to a formation conflict', async () => {
    transactionMock.auctionCreate.mockRejectedValue({
      code: 'P2002',
    });

    await expect(
      service.createFormationAuction('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
