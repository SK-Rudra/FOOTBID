import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ContentTier,
  MatchStatus,
  ParticipantStatus,
  PlayerPosition,
  SquadRole,
} from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SaveSquadDto } from './dto/squad.dto.js';
import { SquadsService } from './squads.service.js';

function createPrismaMock() {
  const participantFindUnique = vi.fn();
  const matchFindUnique = vi.fn();
  const formationFindUnique = vi.fn();
  const managerFindUnique = vi.fn();
  const formationOwnershipFindFirst = vi.fn();
  const managerOwnershipFindFirst = vi.fn();
  const playerOwnershipFindMany = vi.fn();
  const squadUpdateMany = vi.fn();
  const squadCreate = vi.fn();
  const squadFindUniqueOrThrow = vi.fn();
  const squadPlayerDeleteMany = vi.fn();
  const squadPlayerCreateMany = vi.fn();

  const transactionClient = {
    matchParticipant: {
      findUnique: participantFindUnique,
    },
    match: {
      findUnique: matchFindUnique,
    },
    formation: {
      findUnique: formationFindUnique,
    },
    manager: {
      findUnique: managerFindUnique,
    },
    formationOwnership: {
      findFirst: formationOwnershipFindFirst,
    },
    managerOwnership: {
      findFirst: managerOwnershipFindFirst,
    },
    playerOwnership: {
      findMany: playerOwnershipFindMany,
    },
    squad: {
      updateMany: squadUpdateMany,
      create: squadCreate,
      findUniqueOrThrow: squadFindUniqueOrThrow,
    },
    squadPlayer: {
      deleteMany: squadPlayerDeleteMany,
      createMany: squadPlayerCreateMany,
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
    formationFindUnique,
    managerFindUnique,
    formationOwnershipFindFirst,
    managerOwnershipFindFirst,
    playerOwnershipFindMany,
    squadUpdateMany,
    squadCreate,
    squadFindUniqueOrThrow,
    squadPlayerDeleteMany,
    squadPlayerCreateMany,
  };
}

const formationShape = {
  version: 1,
  slots: [
    { slot: 1, position: PlayerPosition.GK, x: 50, y: 90 },
    { slot: 2, position: PlayerPosition.LB, x: 15, y: 72 },
    { slot: 3, position: PlayerPosition.CB, x: 38, y: 75 },
    { slot: 4, position: PlayerPosition.CB, x: 62, y: 75 },
    { slot: 5, position: PlayerPosition.RB, x: 85, y: 72 },
    { slot: 6, position: PlayerPosition.CM, x: 35, y: 53 },
    { slot: 7, position: PlayerPosition.CM, x: 65, y: 53 },
    { slot: 8, position: PlayerPosition.CAM, x: 50, y: 42 },
    { slot: 9, position: PlayerPosition.LW, x: 20, y: 22 },
    { slot: 10, position: PlayerPosition.ST, x: 50, y: 18 },
    { slot: 11, position: PlayerPosition.RW, x: 80, y: 22 },
  ],
};

const formation = {
  id: 'formation-1',
  shape: formationShape,
  tier: ContentTier.PREMIUM,
  isNeutral: false,
  isActive: true,
  dataVersion: '1.0.0',
};

const manager = {
  id: 'manager-1',
  tier: ContentTier.PREMIUM,
  isNeutral: false,
  isActive: true,
  dataVersion: '1.0.0',
};

const goalkeeper = {
  id: 'goalkeeper-1',
  primaryPosition: PlayerPosition.GK,
  secondaryPositions: [],
  overall: 80,
};

const striker = {
  id: 'striker-1',
  primaryPosition: PlayerPosition.ST,
  secondaryPositions: [PlayerPosition.CF],
  overall: 82,
};

const dto: SaveSquadDto = {
  version: 0,
  name: 'Comets XI',
  formationId: formation.id,
  managerId: manager.id,
  players: [
    {
      playerId: goalkeeper.id,
      slot: 1,
      role: SquadRole.STARTER,
      isCaptain: false,
    },
    {
      playerId: striker.id,
      slot: 10,
      role: SquadRole.STARTER,
      isCaptain: true,
    },
  ],
};

function participantRecord(
  squad: {
    id: string;
    version: number;
    isLocked: boolean;
  } | null = null,
  matchStatus = MatchStatus.SQUAD_BUILDING,
) {
  return {
    id: 'participant-1',
    status: ParticipantStatus.CONNECTED,
    match: {
      id: 'match-1',
      status: matchStatus,
      dataVersion: '1.0.0',
    },
    squad,
  };
}

function ownershipRecords() {
  return [
    {
      playerId: goalkeeper.id,
      acquisitionPrice: 5_000_000,
      player: goalkeeper,
    },
    {
      playerId: striker.id,
      acquisitionPrice: 10_000_000,
      player: striker,
    },
  ];
}

function savedSquadRecord(version = 1) {
  const now = new Date('2026-09-01T10:30:00.000Z');

  return {
    id: 'squad-1',
    participantId: 'participant-1',
    formationId: formation.id,
    managerId: manager.id,
    name: dto.name,
    chemistry: 0,
    overallRating: 81,
    version,
    isLocked: false,
    lockedAt: null,
    createdAt: now,
    updatedAt: now,
    formation: {
      id: formation.id,
    },
    manager: {
      id: manager.id,
    },
    players: [
      {
        id: 'squad-player-1',
        playerId: goalkeeper.id,
        slot: 1,
        role: SquadRole.STARTER,
        isCaptain: false,
        assignedPosition: PlayerPosition.GK,
        acquisitionPrice: 5_000_000,
        player: {
          id: goalkeeper.id,
          overall: goalkeeper.overall,
          goalkeeping: 85,
        },
      },
      {
        id: 'squad-player-2',
        playerId: striker.id,
        slot: 10,
        role: SquadRole.STARTER,
        isCaptain: true,
        assignedPosition: PlayerPosition.ST,
        acquisitionPrice: 10_000_000,
        player: {
          id: striker.id,
          overall: striker.overall,
          goalkeeping: 10,
        },
      },
    ],
  };
}

describe('SquadsService atomic squad saving', () => {
  let mocks: ReturnType<typeof createPrismaMock>;
  let service: SquadsService;

  beforeEach(() => {
    mocks = createPrismaMock();
    service = new SquadsService(mocks.prisma);

    mocks.participantFindUnique.mockResolvedValue(participantRecord());
    mocks.formationFindUnique.mockResolvedValue(formation);
    mocks.managerFindUnique.mockResolvedValue(manager);
    mocks.formationOwnershipFindFirst.mockResolvedValue({
      id: 'formation-ownership-1',
    });
    mocks.managerOwnershipFindFirst.mockResolvedValue({
      id: 'manager-ownership-1',
    });
    mocks.playerOwnershipFindMany.mockResolvedValue(ownershipRecords());
    mocks.squadUpdateMany.mockResolvedValue({
      count: 1,
    });
    mocks.squadCreate.mockResolvedValue({
      id: 'squad-1',
    });
    mocks.squadPlayerDeleteMany.mockResolvedValue({
      count: 2,
    });
    mocks.squadPlayerCreateMany.mockResolvedValue({
      count: 2,
    });
    mocks.squadFindUniqueOrThrow.mockResolvedValue(savedSquadRecord());
  });

  it('creates a versioned squad using owned assets and server positions', async () => {
    const result = await service.saveSquad('match-1', 'host-1', dto);

    expect(mocks.squadCreate).toHaveBeenCalledWith({
      data: {
        participantId: 'participant-1',
        formationId: formation.id,
        managerId: manager.id,
        name: 'Comets XI',
        chemistry: 0,
        overallRating: 81,
        version: 1,
      },
      select: {
        id: true,
      },
    });

    expect(mocks.squadPlayerCreateMany).toHaveBeenCalledWith({
      data: [
        {
          matchId: 'match-1',
          squadId: 'squad-1',
          playerId: goalkeeper.id,
          slot: 1,
          role: SquadRole.STARTER,
          isCaptain: false,
          assignedPosition: PlayerPosition.GK,
          acquisitionPrice: 5_000_000,
        },
        {
          matchId: 'match-1',
          squadId: 'squad-1',
          playerId: striker.id,
          slot: 10,
          role: SquadRole.STARTER,
          isCaptain: true,
          assignedPosition: PlayerPosition.ST,
          acquisitionPrice: 10_000_000,
        },
      ],
    });

    expect(result?.ratings).toEqual({
      attack: 82,
      midfield: 0,
      defense: 0,
      goalkeeper: 85,
      overall: 81,
      chemistry: 0,
      squadPower: 81,
    });
  });

  it('replaces an existing draft with an optimistic version check', async () => {
    const existingDto = {
      ...dto,
      version: 3,
    };

    mocks.participantFindUnique.mockResolvedValue(
      participantRecord({
        id: 'squad-1',
        version: 3,
        isLocked: false,
      }),
    );

    mocks.squadFindUniqueOrThrow.mockResolvedValue(savedSquadRecord(4));

    await service.saveSquad('match-1', 'host-1', existingDto);

    expect(mocks.squadUpdateMany).toHaveBeenCalledWith({
      where: {
        id: 'squad-1',
        version: 3,
        isLocked: false,
      },
      data: {
        name: 'Comets XI',
        formationId: formation.id,
        managerId: manager.id,
        overallRating: 81,
        version: {
          increment: 1,
        },
      },
    });

    expect(mocks.squadPlayerDeleteMany).toHaveBeenCalledWith({
      where: {
        squadId: 'squad-1',
      },
    });

    expect(mocks.squadCreate).not.toHaveBeenCalled();
  });

  it('rejects a stale squad version before replacing players', async () => {
    mocks.participantFindUnique.mockResolvedValue(
      participantRecord({
        id: 'squad-1',
        version: 4,
        isLocked: false,
      }),
    );

    await expect(
      service.saveSquad('match-1', 'host-1', {
        ...dto,
        version: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.formationFindUnique).not.toHaveBeenCalled();
    expect(mocks.squadPlayerDeleteMany).not.toHaveBeenCalled();
  });

  it('rejects changes to a locked squad', async () => {
    mocks.participantFindUnique.mockResolvedValue(
      participantRecord({
        id: 'squad-1',
        version: 3,
        isLocked: true,
      }),
    );

    await expect(
      service.saveSquad('match-1', 'host-1', {
        ...dto,
        version: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.formationFindUnique).not.toHaveBeenCalled();
  });

  it('rejects duplicate player assignments before opening a transaction', async () => {
    await expect(
      service.saveSquad('match-1', 'host-1', {
        ...dto,
        players: [
          dto.players[0]!,
          {
            ...dto.players[0]!,
            slot: 2,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('requires a goalkeeper-capable player in the goalkeeper slot', async () => {
    mocks.playerOwnershipFindMany.mockResolvedValue([
      {
        playerId: striker.id,
        acquisitionPrice: 10_000_000,
        player: striker,
      },
    ]);

    await expect(
      service.saveSquad('match-1', 'host-1', {
        ...dto,
        players: [
          {
            playerId: striker.id,
            slot: 1,
            role: SquadRole.STARTER,
            isCaptain: true,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(mocks.squadCreate).not.toHaveBeenCalled();
  });

  it('rejects a formation that the participant cannot access', async () => {
    mocks.formationOwnershipFindFirst.mockResolvedValue(null);

    await expect(
      service.saveSquad('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mocks.playerOwnershipFindMany).not.toHaveBeenCalled();
  });

  it('permits current-version neutral manager and formation fallbacks', async () => {
    mocks.formationFindUnique.mockResolvedValue({
      ...formation,
      tier: ContentTier.FREE,
      isNeutral: true,
    });

    mocks.managerFindUnique.mockResolvedValue({
      ...manager,
      tier: ContentTier.FREE,
      isNeutral: true,
    });

    mocks.formationOwnershipFindFirst.mockResolvedValue(null);
    mocks.managerOwnershipFindFirst.mockResolvedValue(null);

    await expect(
      service.saveSquad('match-1', 'host-1', dto),
    ).resolves.toBeTruthy();

    expect(mocks.squadCreate).toHaveBeenCalled();
  });

  it('rejects edits outside the squad-building phase', async () => {
    mocks.participantFindUnique.mockResolvedValue(
      participantRecord(null, MatchStatus.READY),
    );

    await expect(
      service.saveSquad('match-1', 'host-1', dto),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.formationFindUnique).not.toHaveBeenCalled();
  });
});
