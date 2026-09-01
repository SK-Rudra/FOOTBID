import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MatchStatus,
  ParticipantStatus,
  PlayerPosition,
  SquadRole,
} from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SquadsService } from './squads.service.js';

function createPrismaMock() {
  const participantFindUnique = vi.fn();
  const matchFindUnique = vi.fn();
  const squadUpdateMany = vi.fn();
  const participantUpdateMany = vi.fn();
  const squadCount = vi.fn();
  const matchUpdateMany = vi.fn();
  const squadFindUniqueOrThrow = vi.fn();

  const transactionClient = {
    matchParticipant: {
      findUnique: participantFindUnique,
      updateMany: participantUpdateMany,
    },
    match: {
      findUnique: matchFindUnique,
      updateMany: matchUpdateMany,
    },
    squad: {
      updateMany: squadUpdateMany,
      count: squadCount,
      findUniqueOrThrow: squadFindUniqueOrThrow,
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
    participantFindUnique,
    matchFindUnique,
    squadUpdateMany,
    participantUpdateMany,
    squadCount,
    matchUpdateMany,
    squadFindUniqueOrThrow,
  };
}

const starterPositions = [
  PlayerPosition.GK,
  PlayerPosition.LB,
  PlayerPosition.CB,
  PlayerPosition.CB,
  PlayerPosition.RB,
  PlayerPosition.CM,
  PlayerPosition.CM,
  PlayerPosition.CAM,
  PlayerPosition.LW,
  PlayerPosition.ST,
  PlayerPosition.RW,
];

function squadRecord({
  captain = true,
  isLocked = false,
  playerCount = 11,
  version = 4,
}: {
  captain?: boolean;
  isLocked?: boolean;
  playerCount?: number;
  version?: number;
} = {}) {
  const now = new Date('2026-09-01T11:00:00.000Z');

  return {
    id: 'squad-1',
    participantId: 'participant-1',
    formationId: 'formation-1',
    managerId: 'manager-1',
    name: 'Comets XI',
    chemistry: 0,
    overallRating: 81,
    version,
    isLocked,
    lockedAt: isLocked ? now : null,
    createdAt: now,
    updatedAt: now,
    formation: {
      id: 'formation-1',
    },
    manager: {
      id: 'manager-1',
    },
    players: starterPositions.slice(0, playerCount).map((position, index) => {
      const slot = index + 1;

      return {
        id: `squad-player-${slot}`,
        playerId: `player-${slot}`,
        slot,
        role: SquadRole.STARTER,
        isCaptain: captain && slot === 10,
        assignedPosition: position,
        acquisitionPrice: 5_000_000 + slot,
        player: {
          id: `player-${slot}`,
          primaryPosition: position,
          secondaryPositions: [],
          overall: 76 + slot,
          goalkeeping: position === PlayerPosition.GK ? 85 : 10,
        },
      };
    }),
  };
}

function participantRecord({
  matchStatus = MatchStatus.SQUAD_BUILDING,
  squad = squadRecord(),
}: {
  matchStatus?: MatchStatus;
  squad?: ReturnType<typeof squadRecord> | null;
} = {}) {
  return {
    id: 'participant-1',
    status: ParticipantStatus.CONNECTED,
    match: {
      id: 'match-1',
      status: matchStatus,
    },
    squad,
  };
}

describe('SquadsService squad locking', () => {
  let mocks: ReturnType<typeof createPrismaMock>;
  let service: SquadsService;

  beforeEach(() => {
    mocks = createPrismaMock();
    service = new SquadsService(mocks.prisma);

    mocks.participantFindUnique.mockResolvedValue(participantRecord());
    mocks.squadUpdateMany.mockResolvedValue({
      count: 1,
    });
    mocks.participantUpdateMany.mockResolvedValue({
      count: 1,
    });
    mocks.squadCount.mockResolvedValue(1);
    mocks.matchUpdateMany.mockResolvedValue({
      count: 1,
    });
    mocks.squadFindUniqueOrThrow.mockResolvedValue(
      squadRecord({
        isLocked: true,
        version: 5,
      }),
    );
  });

  it('locks a complete squad and marks its participant ready', async () => {
    const result = await service.lockSquad('match-1', 'host-1', {
      version: 4,
    });

    expect(mocks.squadUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'squad-1',
        version: 4,
        isLocked: false,
      },
      data: {
        isLocked: true,
        lockedAt: expect.any(Date),
        version: {
          increment: 1,
        },
      },
    });

    expect(mocks.participantUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'participant-1',
        status: {
          not: ParticipantStatus.LEFT,
        },
      },
      data: {
        status: ParticipantStatus.READY,
        readyAt: expect.any(Date),
      },
    });

    expect(result).toMatchObject({
      matchStatus: MatchStatus.SQUAD_BUILDING,
      replayed: false,
      squad: {
        id: 'squad-1',
        isLocked: true,
        version: 5,
      },
    });

    expect(mocks.matchUpdateMany).not.toHaveBeenCalled();
  });

  it('moves the match to ready when both squads are locked', async () => {
    mocks.squadCount.mockResolvedValue(2);

    const result = await service.lockSquad('match-1', 'host-1', {
      version: 4,
    });

    expect(mocks.matchUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'match-1',
        status: MatchStatus.SQUAD_BUILDING,
      },
      data: {
        status: MatchStatus.READY,
      },
    });

    expect(result.matchStatus).toBe(MatchStatus.READY);
  });

  it('rejects an incomplete starting eleven', async () => {
    mocks.participantFindUnique.mockResolvedValue(
      participantRecord({
        squad: squadRecord({
          playerCount: 10,
        }),
      }),
    );

    await expect(
      service.lockSquad('match-1', 'host-1', {
        version: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mocks.squadUpdateMany).not.toHaveBeenCalled();
  });

  it('requires exactly one starter captain', async () => {
    mocks.participantFindUnique.mockResolvedValue(
      participantRecord({
        squad: squadRecord({
          captain: false,
        }),
      }),
    );

    await expect(
      service.lockSquad('match-1', 'host-1', {
        version: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mocks.squadUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a stale lock version', async () => {
    await expect(
      service.lockSquad('match-1', 'host-1', {
        version: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.squadUpdateMany).not.toHaveBeenCalled();
  });

  it('replays an already locked squad without mutating it', async () => {
    mocks.participantFindUnique.mockResolvedValue(
      participantRecord({
        matchStatus: MatchStatus.READY,
        squad: squadRecord({
          isLocked: true,
          version: 5,
        }),
      }),
    );

    const result = await service.lockSquad('match-1', 'host-1', {
      version: 4,
    });

    expect(result).toMatchObject({
      matchStatus: MatchStatus.READY,
      replayed: true,
      squad: {
        isLocked: true,
        version: 5,
      },
    });

    expect(mocks.squadUpdateMany).not.toHaveBeenCalled();
    expect(mocks.participantUpdateMany).not.toHaveBeenCalled();
  });

  it('requires a saved squad before locking', async () => {
    mocks.participantFindUnique.mockResolvedValue(
      participantRecord({
        squad: null,
      }),
    );

    await expect(
      service.lockSquad('match-1', 'host-1', {
        version: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(mocks.squadUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects locking outside the squad-building phase', async () => {
    mocks.participantFindUnique.mockResolvedValue(
      participantRecord({
        matchStatus: MatchStatus.AUCTION,
      }),
    );

    await expect(
      service.lockSquad('match-1', 'host-1', {
        version: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.squadUpdateMany).not.toHaveBeenCalled();
  });

  it('rolls back if the participant state changes concurrently', async () => {
    mocks.participantUpdateMany.mockResolvedValue({
      count: 0,
    });

    await expect(
      service.lockSquad('match-1', 'host-1', {
        version: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.squadCount).not.toHaveBeenCalled();
  });

  it('maps database lock constraint failures to a client error', async () => {
    mocks.transaction.mockRejectedValueOnce({
      code: 'P2004',
    });

    await expect(
      service.lockSquad('match-1', 'host-1', {
        version: 4,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
