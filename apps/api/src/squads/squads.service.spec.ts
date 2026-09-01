import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuctionStatus,
  MatchStatus,
  ParticipantStatus,
} from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SquadsService } from './squads.service.js';

function createPrismaMock() {
  const matchFindUnique = vi.fn();
  const matchUpdateMany = vi.fn();
  const auctionFindFirst = vi.fn();
  const playerOwnershipFindMany = vi.fn();

  const transactionClient = {
    match: {
      findUnique: matchFindUnique,
      updateMany: matchUpdateMany,
    },
    auction: {
      findFirst: auctionFindFirst,
    },
    playerOwnership: {
      findMany: playerOwnershipFindMany,
    },
  };

  const transaction = vi.fn(
    async (operation: (client: object) => Promise<unknown>) =>
      operation(transactionClient),
  );

  const prisma = {
    $transaction: transaction,
  } as unknown as PrismaService;

  return {
    prisma,
    transactionClient,
    transaction,
    matchFindUnique,
    matchUpdateMany,
    auctionFindFirst,
    playerOwnershipFindMany,
  };
}

function playerOwnerships(firstCount = 11, secondCount = 11) {
  return [
    ...Array.from({ length: firstCount }, () => ({
      participantId: 'participant-1',
    })),
    ...Array.from({ length: secondCount }, () => ({
      participantId: 'participant-2',
    })),
  ];
}

describe('SquadsService squad-building transition', () => {
  let mocks: ReturnType<typeof createPrismaMock>;
  let service: SquadsService;

  beforeEach(() => {
    mocks = createPrismaMock();
    service = new SquadsService(mocks.prisma);

    mocks.matchFindUnique.mockResolvedValue({
      id: 'match-1',
      createdById: 'host-1',
      status: MatchStatus.AUCTION,
      participants: [
        {
          id: 'participant-1',
          userId: 'host-1',
          status: ParticipantStatus.CONNECTED,
        },
        {
          id: 'participant-2',
          userId: 'guest-1',
          status: ParticipantStatus.CONNECTED,
        },
      ],
    });

    mocks.auctionFindFirst.mockResolvedValue(null);
    mocks.playerOwnershipFindMany.mockResolvedValue(playerOwnerships());
    mocks.matchUpdateMany.mockResolvedValue({
      count: 1,
    });
  });

  it('starts squad building when both participants own a starting eleven', async () => {
    const result = await service.startSquadBuilding('match-1', 'host-1');

    expect(mocks.auctionFindFirst).toHaveBeenCalledWith({
      where: {
        matchId: 'match-1',
        status: {
          in: [
            AuctionStatus.WAITING,
            AuctionStatus.ACTIVE,
            AuctionStatus.LAST_CALL,
          ],
        },
      },
      select: {
        id: true,
      },
    });

    expect(mocks.matchUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'match-1',
        status: MatchStatus.AUCTION,
      },
      data: {
        status: MatchStatus.SQUAD_BUILDING,
      },
    });

    expect(result).toEqual({
      matchId: 'match-1',
      status: MatchStatus.SQUAD_BUILDING,
      started: true,
    });
  });

  it('allows only the host to start squad building', async () => {
    await expect(
      service.startSquadBuilding('match-1', 'guest-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mocks.auctionFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a missing match', async () => {
    mocks.matchFindUnique.mockResolvedValue(null);

    await expect(
      service.startSquadBuilding('missing-match', 'host-1'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mocks.auctionFindFirst).not.toHaveBeenCalled();
  });

  it('rejects the transition while an auction remains unfinished', async () => {
    mocks.auctionFindFirst.mockResolvedValue({
      id: 'auction-1',
    });

    await expect(
      service.startSquadBuilding('match-1', 'host-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.playerOwnershipFindMany).not.toHaveBeenCalled();
  });

  it('requires both participants to own at least eleven players', async () => {
    mocks.playerOwnershipFindMany.mockResolvedValue(playerOwnerships(11, 10));

    await expect(
      service.startSquadBuilding('match-1', 'host-1'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.matchUpdateMany).not.toHaveBeenCalled();
  });

  it('replays an already-started squad-building transition safely', async () => {
    mocks.matchFindUnique.mockResolvedValue({
      id: 'match-1',
      createdById: 'host-1',
      status: MatchStatus.SQUAD_BUILDING,
      participants: [
        {
          id: 'participant-1',
          userId: 'host-1',
          status: ParticipantStatus.CONNECTED,
        },
        {
          id: 'participant-2',
          userId: 'guest-1',
          status: ParticipantStatus.CONNECTED,
        },
      ],
    });

    const result = await service.startSquadBuilding('match-1', 'host-1');

    expect(result).toEqual({
      matchId: 'match-1',
      status: MatchStatus.SQUAD_BUILDING,
      started: false,
    });

    expect(mocks.auctionFindFirst).not.toHaveBeenCalled();
    expect(mocks.matchUpdateMany).not.toHaveBeenCalled();
  });
});
