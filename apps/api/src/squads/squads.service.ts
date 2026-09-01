import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import {
  AuctionStatus,
  ContentTier,
  MatchStatus,
  ParticipantStatus,
  PlayerPosition,
  SquadRole,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const unfinishedAuctionStatuses = [
  AuctionStatus.WAITING,
  AuctionStatus.ACTIVE,
  AuctionStatus.LAST_CALL,
];

const defenderPositions = new Set<PlayerPosition>([
  PlayerPosition.LB,
  PlayerPosition.LWB,
  PlayerPosition.CB,
  PlayerPosition.RB,
  PlayerPosition.RWB,
]);

const midfieldPositions = new Set<PlayerPosition>([
  PlayerPosition.CDM,
  PlayerPosition.CM,
  PlayerPosition.CAM,
  PlayerPosition.LM,
  PlayerPosition.RM,
]);

const attackingPositions = new Set<PlayerPosition>([
  PlayerPosition.LW,
  PlayerPosition.RW,
  PlayerPosition.CF,
  PlayerPosition.ST,
]);

const playerSummarySelect = {
  id: true,
  fullName: true,
  shortName: true,
  nationalityCode: true,
  primaryPosition: true,
  secondaryPositions: true,
  overall: true,
  pace: true,
  shooting: true,
  passing: true,
  dribbling: true,
  defending: true,
  physical: true,
  goalkeeping: true,
  marketValue: true,
  club: {
    select: {
      id: true,
      name: true,
      shortName: true,
    },
  },
} as const;

const managerSummarySelect = {
  id: true,
  fullName: true,
  nationalityCode: true,
  tacticalStyle: true,
  preferredFormations: true,
  passingPhilosophy: true,
  defensivePhilosophy: true,
  pressingStyle: true,
  overall: true,
  attacking: true,
  defending: true,
  adaptability: true,
  manManagement: true,
  attackingBonus: true,
  midfieldBonus: true,
  defendingBonus: true,
  chemistryBonus: true,
  marketValue: true,
  tier: true,
  isNeutral: true,
} as const;

const formationSummarySelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  shape: true,
  buildUpStyle: true,
  attackingStyle: true,
  defensiveStyle: true,
  width: true,
  tempo: true,
  pressingIntensity: true,
  attackingBonus: true,
  midfieldBonus: true,
  defendingBonus: true,
  chemistryBonus: true,
  marketValue: true,
  tier: true,
  isNeutral: true,
} as const;

const squadSelect = {
  id: true,
  participantId: true,
  formationId: true,
  managerId: true,
  name: true,
  chemistry: true,
  overallRating: true,
  version: true,
  isLocked: true,
  lockedAt: true,
  createdAt: true,
  updatedAt: true,
  formation: {
    select: formationSummarySelect,
  },
  manager: {
    select: managerSummarySelect,
  },
  players: {
    select: {
      id: true,
      playerId: true,
      slot: true,
      role: true,
      isCaptain: true,
      assignedPosition: true,
      acquisitionPrice: true,
      player: {
        select: playerSummarySelect,
      },
    },
    orderBy: {
      slot: 'asc',
    },
  },
} as const;

type SquadRecord = Prisma.SquadGetPayload<{
  select: typeof squadSelect;
}>;

type ManagerSummary = Prisma.ManagerGetPayload<{
  select: typeof managerSummarySelect;
}>;

type FormationSummary = Prisma.FormationGetPayload<{
  select: typeof formationSummarySelect;
}>;

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function squadResponse(squad: SquadRecord | null) {
  if (!squad) {
    return null;
  }

  const starters = squad.players.filter(
    ({ role }) => role === SquadRole.STARTER,
  );

  const attacking = starters.filter(({ assignedPosition }) =>
    attackingPositions.has(assignedPosition),
  );

  const midfield = starters.filter(({ assignedPosition }) =>
    midfieldPositions.has(assignedPosition),
  );

  const defense = starters.filter(({ assignedPosition }) =>
    defenderPositions.has(assignedPosition),
  );

  const goalkeepers = starters.filter(
    ({ assignedPosition }) => assignedPosition === PlayerPosition.GK,
  );

  return {
    ...squad,
    ratings: {
      attack: average(attacking.map(({ player }) => player.overall)),
      midfield: average(midfield.map(({ player }) => player.overall)),
      defense: average(defense.map(({ player }) => player.overall)),
      goalkeeper: average(goalkeepers.map(({ player }) => player.goalkeeping)),
      overall: average(starters.map(({ player }) => player.overall)),
      chemistry: squad.chemistry,
      squadPower: average(starters.map(({ player }) => player.overall)),
    },
  };
}

function managerOption(
  manager: ManagerSummary,
  access: 'NEUTRAL' | 'OWNED',
  acquisitionPrice: number | null,
) {
  return {
    ...manager,
    access,
    acquisitionPrice,
  };
}

function formationOption(
  formation: FormationSummary,
  access: 'NEUTRAL' | 'OWNED',
  acquisitionPrice: number | null,
) {
  return {
    ...formation,
    access,
    acquisitionPrice,
  };
}

@Injectable()
export class SquadsService {
  constructor(private readonly prisma: PrismaService) {}

  async startSquadBuilding(matchId: string, userId: string) {
    return this.prisma.$transaction(
      async (transactionClient) => {
        const match = await transactionClient.match.findUnique({
          where: {
            id: matchId,
          },
          select: {
            id: true,
            createdById: true,
            status: true,
            participants: {
              select: {
                id: true,
                userId: true,
                status: true,
              },
            },
          },
        });

        if (!match) {
          throw new NotFoundException('Match not found.');
        }

        if (match.createdById !== userId) {
          throw new ForbiddenException(
            'Only the match host can start squad building.',
          );
        }

        const participants = match.participants.filter(
          ({ status }) => status !== ParticipantStatus.LEFT,
        );

        if (
          !participants.some((participant) => participant.userId === userId)
        ) {
          throw new ForbiddenException(
            'You are not an active participant in this match.',
          );
        }

        if (match.status === MatchStatus.SQUAD_BUILDING) {
          return {
            matchId: match.id,
            status: MatchStatus.SQUAD_BUILDING,
            started: false,
          };
        }

        if (match.status !== MatchStatus.AUCTION) {
          throw new ConflictException(
            'This match cannot enter squad building from its current status.',
          );
        }

        if (participants.length !== 2) {
          throw new ConflictException(
            'Both participants must be present before squad building starts.',
          );
        }

        const unfinishedAuction = await transactionClient.auction.findFirst({
          where: {
            matchId,
            status: {
              in: unfinishedAuctionStatuses,
            },
          },
          select: {
            id: true,
          },
        });

        if (unfinishedAuction) {
          throw new ConflictException(
            'Finish or cancel the current auction before squad building.',
          );
        }

        const participantIds = participants.map(({ id }) => id);

        const ownerships = await transactionClient.playerOwnership.findMany({
          where: {
            matchId,
            participantId: {
              in: participantIds,
            },
          },
          select: {
            participantId: true,
          },
        });

        const ownershipCounts = new Map<string, number>(
          participantIds.map((participantId) => [participantId, 0]),
        );

        for (const ownership of ownerships) {
          ownershipCounts.set(
            ownership.participantId,
            (ownershipCounts.get(ownership.participantId) ?? 0) + 1,
          );
        }

        const participantWithoutStartingEleven = participantIds.some(
          (participantId) => (ownershipCounts.get(participantId) ?? 0) < 11,
        );

        if (participantWithoutStartingEleven) {
          throw new ConflictException(
            'Both participants must own at least 11 players before squad building.',
          );
        }

        const updated = await transactionClient.match.updateMany({
          where: {
            id: matchId,
            status: MatchStatus.AUCTION,
          },
          data: {
            status: MatchStatus.SQUAD_BUILDING,
          },
        });

        if (updated.count !== 1) {
          throw new ConflictException(
            'The match status changed while squad building was starting.',
          );
        }

        return {
          matchId: match.id,
          status: MatchStatus.SQUAD_BUILDING,
          started: true,
        };
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  async getSquad(matchId: string, userId: string) {
    const participant = await this.prisma.matchParticipant.findUnique({
      where: {
        matchId_userId: {
          matchId,
          userId,
        },
      },
      select: {
        id: true,
        userId: true,
        side: true,
        status: true,
        match: {
          select: {
            id: true,
            roomCode: true,
            createdById: true,
            status: true,
            dataVersion: true,
            participants: {
              select: {
                id: true,
                userId: true,
                squad: {
                  select: {
                    isLocked: true,
                  },
                },
              },
            },
          },
        },
        squad: {
          select: squadSelect,
        },
        playerOwnerships: {
          select: {
            id: true,
            acquisitionPrice: true,
            acquiredAt: true,
            player: {
              select: playerSummarySelect,
            },
          },
          orderBy: {
            acquiredAt: 'asc',
          },
        },
        managerOwnership: {
          select: {
            acquisitionPrice: true,
            manager: {
              select: managerSummarySelect,
            },
          },
        },
        formationOwnership: {
          select: {
            acquisitionPrice: true,
            formation: {
              select: formationSummarySelect,
            },
          },
        },
      },
    });

    if (!participant) {
      const match = await this.prisma.match.findUnique({
        where: {
          id: matchId,
        },
        select: {
          id: true,
        },
      });

      if (!match) {
        throw new NotFoundException('Match not found.');
      }

      throw new ForbiddenException('You are not a participant in this match.');
    }

    if (participant.status === ParticipantStatus.LEFT) {
      throw new ForbiddenException(
        'You are not an active participant in this match.',
      );
    }

    const [neutralManager, neutralFormation] = await Promise.all([
      this.prisma.manager.findFirst({
        where: {
          dataVersion: participant.match.dataVersion,
          tier: ContentTier.FREE,
          isNeutral: true,
          isActive: true,
        },
        select: managerSummarySelect,
      }),
      this.prisma.formation.findFirst({
        where: {
          dataVersion: participant.match.dataVersion,
          tier: ContentTier.FREE,
          isNeutral: true,
          isActive: true,
        },
        select: formationSummarySelect,
      }),
    ]);

    const managers = neutralManager
      ? [managerOption(neutralManager, 'NEUTRAL', null)]
      : [];

    const ownedManager = participant.managerOwnership;

    if (ownedManager && ownedManager.manager.id !== neutralManager?.id) {
      managers.push(
        managerOption(
          ownedManager.manager,
          'OWNED',
          ownedManager.acquisitionPrice,
        ),
      );
    }

    const formations = neutralFormation
      ? [formationOption(neutralFormation, 'NEUTRAL', null)]
      : [];

    const ownedFormation = participant.formationOwnership;

    if (
      ownedFormation &&
      ownedFormation.formation.id !== neutralFormation?.id
    ) {
      formations.push(
        formationOption(
          ownedFormation.formation,
          'OWNED',
          ownedFormation.acquisitionPrice,
        ),
      );
    }

    const opponent = participant.match.participants.find(
      ({ id }) => id !== participant.id,
    );

    return {
      match: {
        id: participant.match.id,
        roomCode: participant.match.roomCode,
        status: participant.match.status,
        isHost: participant.match.createdById === userId,
        opponentLocked: opponent?.squad?.isLocked ?? false,
      },
      participant: {
        id: participant.id,
        userId: participant.userId,
        side: participant.side,
        status: participant.status,
      },
      canEdit:
        participant.match.status === MatchStatus.SQUAD_BUILDING &&
        !participant.squad?.isLocked,
      squad: squadResponse(participant.squad),
      inventory: {
        players: participant.playerOwnerships.map(
          ({ id, acquisitionPrice, acquiredAt, player }) => ({
            ownershipId: id,
            acquisitionPrice,
            acquiredAt,
            ...player,
          }),
        ),
        managers,
        formations,
      },
    };
  }
}
