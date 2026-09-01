import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ContentTier,
  MatchStatus,
  ParticipantSide,
  ParticipantStatus,
  PlayerPosition,
  SquadRole,
} from '../generated/prisma/enums.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SquadsService } from './squads.service.js';

function createPrismaMock() {
  const participantFindUnique = vi.fn();
  const matchFindUnique = vi.fn();
  const managerFindFirst = vi.fn();
  const formationFindFirst = vi.fn();

  const prisma = {
    matchParticipant: {
      findUnique: participantFindUnique,
    },
    match: {
      findUnique: matchFindUnique,
    },
    manager: {
      findFirst: managerFindFirst,
    },
    formation: {
      findFirst: formationFindFirst,
    },
  } as unknown as PrismaService;

  return {
    prisma,
    participantFindUnique,
    matchFindUnique,
    managerFindFirst,
    formationFindFirst,
  };
}

const player = {
  id: 'player-1',
  fullName: 'Arif Hossain',
  shortName: 'A. Hossain',
  nationalityCode: 'BD',
  primaryPosition: PlayerPosition.ST,
  secondaryPositions: [PlayerPosition.CF],
  overall: 82,
  pace: 84,
  shooting: 83,
  passing: 74,
  dribbling: 81,
  defending: 35,
  physical: 77,
  goalkeeping: 10,
  marketValue: 10_000_000,
  club: {
    id: 'club-1',
    name: 'Dhaka Comets',
    shortName: 'COMETS',
  },
};

const neutralManager = {
  id: 'manager-neutral',
  fullName: 'KickoffBid Neutral Coach',
  nationalityCode: 'BD',
  tacticalStyle: 'Balanced',
  preferredFormations: ['4-4-2-basic'],
  passingPhilosophy: 'Balanced',
  defensivePhilosophy: 'Balanced',
  pressingStyle: 'Balanced',
  overall: 65,
  attacking: 65,
  defending: 65,
  adaptability: 65,
  manManagement: 65,
  attackingBonus: 0,
  midfieldBonus: 0,
  defendingBonus: 0,
  chemistryBonus: 0,
  marketValue: 0,
  tier: ContentTier.FREE,
  isNeutral: true,
};

const ownedManager = {
  ...neutralManager,
  id: 'manager-owned',
  fullName: 'Nayeem Rahman',
  tacticalStyle: 'High Press',
  preferredFormations: ['4-3-3'],
  overall: 82,
  attacking: 84,
  defending: 78,
  marketValue: 12_000_000,
  tier: ContentTier.PREMIUM,
  isNeutral: false,
};

const neutralFormation = {
  id: 'formation-neutral',
  code: '4-4-2-basic',
  name: 'Basic 4-4-2',
  description: 'Neutral fallback formation.',
  shape: {
    version: 1,
    slots: [],
  },
  buildUpStyle: 'Balanced',
  attackingStyle: 'Balanced',
  defensiveStyle: 'Balanced',
  width: 50,
  tempo: 50,
  pressingIntensity: 50,
  attackingBonus: 0,
  midfieldBonus: 0,
  defendingBonus: 0,
  chemistryBonus: 0,
  marketValue: 0,
  tier: ContentTier.FREE,
  isNeutral: true,
};

const ownedFormation = {
  ...neutralFormation,
  id: 'formation-owned',
  code: '4-3-3',
  name: 'Attacking 4-3-3',
  description: 'Wide attacking formation.',
  attackingStyle: 'Wide',
  attackingBonus: 2,
  midfieldBonus: 1,
  chemistryBonus: 1,
  marketValue: 8_000_000,
  tier: ContentTier.PREMIUM,
  isNeutral: false,
};

function participantRecord() {
  const now = new Date('2026-09-01T10:00:00.000Z');

  return {
    id: 'participant-1',
    userId: 'host-1',
    side: ParticipantSide.PLAYER_ONE,
    status: ParticipantStatus.CONNECTED,
    match: {
      id: 'match-1',
      roomCode: 'ROOM01',
      createdById: 'host-1',
      status: MatchStatus.SQUAD_BUILDING,
      dataVersion: '1.0.0',
      participants: [
        {
          id: 'participant-1',
          userId: 'host-1',
          squad: {
            isLocked: false,
          },
        },
        {
          id: 'participant-2',
          userId: 'guest-1',
          squad: {
            isLocked: true,
          },
        },
      ],
    },
    squad: {
      id: 'squad-1',
      participantId: 'participant-1',
      formationId: ownedFormation.id,
      managerId: ownedManager.id,
      name: 'Comets XI',
      chemistry: 0,
      overallRating: 82,
      version: 1,
      isLocked: false,
      lockedAt: null,
      createdAt: now,
      updatedAt: now,
      formation: ownedFormation,
      manager: ownedManager,
      players: [
        {
          id: 'squad-player-1',
          playerId: player.id,
          slot: 10,
          role: SquadRole.STARTER,
          isCaptain: true,
          assignedPosition: PlayerPosition.ST,
          acquisitionPrice: 10_000_000,
          player,
        },
      ],
    },
    playerOwnerships: [
      {
        id: 'ownership-1',
        acquisitionPrice: 10_000_000,
        acquiredAt: now,
        player,
      },
    ],
    managerOwnership: {
      acquisitionPrice: 12_000_000,
      manager: ownedManager,
    },
    formationOwnership: {
      acquisitionPrice: 8_000_000,
      formation: ownedFormation,
    },
  };
}

describe('SquadsService squad read model', () => {
  let mocks: ReturnType<typeof createPrismaMock>;
  let service: SquadsService;

  beforeEach(() => {
    mocks = createPrismaMock();
    service = new SquadsService(mocks.prisma);

    mocks.participantFindUnique.mockResolvedValue(participantRecord());
    mocks.managerFindFirst.mockResolvedValue(neutralManager);
    mocks.formationFindFirst.mockResolvedValue(neutralFormation);
  });

  it('returns the private squad and permitted owned asset inventory', async () => {
    const result = await service.getSquad('match-1', 'host-1');

    expect(result.match).toEqual({
      id: 'match-1',
      roomCode: 'ROOM01',
      status: MatchStatus.SQUAD_BUILDING,
      isHost: true,
      opponentLocked: true,
    });

    expect(result.canEdit).toBe(true);

    expect(result.inventory.players[0]).toMatchObject({
      ownershipId: 'ownership-1',
      id: player.id,
      shortName: player.shortName,
      acquisitionPrice: 10_000_000,
    });

    expect(result.inventory.managers.map(({ access }) => access)).toEqual([
      'NEUTRAL',
      'OWNED',
    ]);

    expect(result.inventory.formations.map(({ access }) => access)).toEqual([
      'NEUTRAL',
      'OWNED',
    ]);

    expect(result.squad?.ratings).toEqual({
      attack: 82,
      midfield: 0,
      defense: 0,
      goalkeeper: 0,
      overall: 82,
      chemistry: 0,
      squadPower: 82,
    });

    expect(result.squad).not.toHaveProperty('tactics');
  });

  it('rejects a missing match', async () => {
    mocks.participantFindUnique.mockResolvedValue(null);
    mocks.matchFindUnique.mockResolvedValue(null);

    await expect(
      service.getSquad('missing-match', 'host-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a user who is not a match participant', async () => {
    mocks.participantFindUnique.mockResolvedValue(null);
    mocks.matchFindUnique.mockResolvedValue({
      id: 'match-1',
    });

    await expect(
      service.getSquad('match-1', 'outsider-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a participant who has left the match', async () => {
    mocks.participantFindUnique.mockResolvedValue({
      ...participantRecord(),
      status: ParticipantStatus.LEFT,
    });

    await expect(service.getSquad('match-1', 'host-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    expect(mocks.managerFindFirst).not.toHaveBeenCalled();
    expect(mocks.formationFindFirst).not.toHaveBeenCalled();
  });
});
