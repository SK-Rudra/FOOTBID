import {
  BadRequestException,
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
import type { SaveSquadDto } from './dto/squad.dto.js';

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

function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function roleAllowsSlot(role: SquadRole, slot: number): boolean {
  if (role === SquadRole.STARTER) {
    return slot >= 1 && slot <= 11;
  }

  if (role === SquadRole.SUBSTITUTE) {
    return slot >= 12 && slot <= 18;
  }

  return role === SquadRole.RESERVE && slot >= 19 && slot <= 30;
}

function validateAssignmentBasics(assignments: SaveSquadDto['players']): void {
  const playerIds = new Set<string>();
  const slots = new Set<number>();
  let captainCount = 0;

  for (const assignment of assignments) {
    if (!roleAllowsSlot(assignment.role, assignment.slot)) {
      throw new BadRequestException(
        `Slot ${assignment.slot} is invalid for role ${assignment.role}.`,
      );
    }

    if (playerIds.has(assignment.playerId)) {
      throw new BadRequestException(
        'A player cannot occupy multiple squad slots.',
      );
    }

    if (slots.has(assignment.slot)) {
      throw new BadRequestException(
        'Multiple players cannot occupy the same squad slot.',
      );
    }

    if (assignment.isCaptain) {
      captainCount += 1;

      if (assignment.role !== SquadRole.STARTER) {
        throw new BadRequestException('The squad captain must be a starter.');
      }
    }

    playerIds.add(assignment.playerId);
    slots.add(assignment.slot);
  }

  if (captainCount > 1) {
    throw new BadRequestException('A squad cannot contain multiple captains.');
  }
}

function formationSlotPositions(
  shape: Prisma.JsonValue,
): Map<number, PlayerPosition> {
  if (typeof shape !== 'object' || shape === null || Array.isArray(shape)) {
    throw new ConflictException(
      'Selected formation has an invalid tactical shape.',
    );
  }

  const slots = shape['slots'];

  if (!Array.isArray(slots)) {
    throw new ConflictException(
      'Selected formation has an invalid tactical shape.',
    );
  }

  const validPositions = new Set<string>(Object.values(PlayerPosition));
  const positions = new Map<number, PlayerPosition>();

  for (const entry of slots) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new ConflictException(
        'Selected formation has an invalid tactical shape.',
      );
    }

    const slot = entry['slot'];
    const position = entry['position'];

    if (
      typeof slot !== 'number' ||
      !Number.isInteger(slot) ||
      slot < 1 ||
      slot > 11 ||
      typeof position !== 'string' ||
      !validPositions.has(position) ||
      positions.has(slot)
    ) {
      throw new ConflictException(
        'Selected formation has an invalid tactical shape.',
      );
    }

    positions.set(slot, position as PlayerPosition);
  }

  if (
    positions.size !== 11 ||
    Array.from({ length: 11 }, (_, index) => index + 1).some(
      (slot) => !positions.has(slot),
    )
  ) {
    throw new ConflictException(
      'Selected formation must define exactly eleven unique starter slots.',
    );
  }

  return positions;
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

  async saveSquad(matchId: string, userId: string, dto: SaveSquadDto) {
    validateAssignmentBasics(dto.players);

    try {
      return await this.prisma.$transaction(
        async (transactionClient) => {
          const participant =
            await transactionClient.matchParticipant.findUnique({
              where: {
                matchId_userId: {
                  matchId,
                  userId,
                },
              },
              select: {
                id: true,
                status: true,
                match: {
                  select: {
                    id: true,
                    status: true,
                    dataVersion: true,
                  },
                },
                squad: {
                  select: {
                    id: true,
                    version: true,
                    isLocked: true,
                  },
                },
              },
            });

          if (!participant) {
            const match = await transactionClient.match.findUnique({
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

            throw new ForbiddenException(
              'You are not a participant in this match.',
            );
          }

          if (participant.status === ParticipantStatus.LEFT) {
            throw new ForbiddenException(
              'You are not an active participant in this match.',
            );
          }

          if (participant.match.status !== MatchStatus.SQUAD_BUILDING) {
            throw new ConflictException(
              'Squad drafts can only be edited during squad building.',
            );
          }

          if (participant.squad?.isLocked) {
            throw new ConflictException('A locked squad cannot be edited.');
          }

          if (participant.squad) {
            if (participant.squad.version !== dto.version) {
              throw new ConflictException(
                'This squad draft is stale. Reload it before saving.',
              );
            }
          } else if (dto.version !== 0) {
            throw new ConflictException(
              'A new squad draft must start at version 0.',
            );
          }

          const [formation, manager, formationOwnership, managerOwnership] =
            await Promise.all([
              transactionClient.formation.findUnique({
                where: {
                  id: dto.formationId,
                },
                select: {
                  id: true,
                  shape: true,
                  tier: true,
                  isNeutral: true,
                  isActive: true,
                  dataVersion: true,
                },
              }),
              transactionClient.manager.findUnique({
                where: {
                  id: dto.managerId,
                },
                select: {
                  id: true,
                  tier: true,
                  isNeutral: true,
                  isActive: true,
                  dataVersion: true,
                },
              }),
              transactionClient.formationOwnership.findFirst({
                where: {
                  matchId,
                  participantId: participant.id,
                  formationId: dto.formationId,
                },
                select: {
                  id: true,
                },
              }),
              transactionClient.managerOwnership.findFirst({
                where: {
                  matchId,
                  participantId: participant.id,
                  managerId: dto.managerId,
                },
                select: {
                  id: true,
                },
              }),
            ]);

          if (!formation) {
            throw new NotFoundException('Formation not found.');
          }

          if (!manager) {
            throw new NotFoundException('Manager not found.');
          }

          const neutralFormationAllowed =
            formation.tier === ContentTier.FREE &&
            formation.isNeutral &&
            formation.isActive &&
            formation.dataVersion === participant.match.dataVersion;

          if (!neutralFormationAllowed && !formationOwnership) {
            throw new ForbiddenException(
              'This formation is not available to your squad.',
            );
          }

          const neutralManagerAllowed =
            manager.tier === ContentTier.FREE &&
            manager.isNeutral &&
            manager.isActive &&
            manager.dataVersion === participant.match.dataVersion;

          if (!neutralManagerAllowed && !managerOwnership) {
            throw new ForbiddenException(
              'This manager is not available to your squad.',
            );
          }

          const slotPositions = formationSlotPositions(formation.shape);
          const playerIds = dto.players.map(({ playerId }) => playerId);

          const ownerships = await transactionClient.playerOwnership.findMany({
            where: {
              matchId,
              participantId: participant.id,
              playerId: {
                in: playerIds,
              },
            },
            select: {
              playerId: true,
              acquisitionPrice: true,
              player: {
                select: {
                  primaryPosition: true,
                  secondaryPositions: true,
                  overall: true,
                },
              },
            },
          });

          if (ownerships.length !== playerIds.length) {
            throw new ForbiddenException(
              'Every selected player must be owned by this participant.',
            );
          }

          const ownershipByPlayerId = new Map(
            ownerships.map((ownership) => [ownership.playerId, ownership]),
          );

          const assignments = dto.players.map((assignment) => {
            const ownership = ownershipByPlayerId.get(assignment.playerId);

            if (!ownership) {
              throw new ForbiddenException(
                'Every selected player must be owned by this participant.',
              );
            }

            const assignedPosition =
              assignment.role === SquadRole.STARTER
                ? slotPositions.get(assignment.slot)
                : ownership.player.primaryPosition;

            if (!assignedPosition) {
              throw new BadRequestException(
                `Formation slot ${assignment.slot} is unavailable.`,
              );
            }

            if (
              assignedPosition === PlayerPosition.GK &&
              ownership.player.primaryPosition !== PlayerPosition.GK &&
              !ownership.player.secondaryPositions.includes(PlayerPosition.GK)
            ) {
              throw new BadRequestException(
                'The goalkeeper slot requires a goalkeeper.',
              );
            }

            return {
              matchId,
              playerId: assignment.playerId,
              slot: assignment.slot,
              role: assignment.role,
              isCaptain: assignment.isCaptain,
              assignedPosition,
              acquisitionPrice: ownership.acquisitionPrice,
              overall: ownership.player.overall,
            };
          });

          const overallRating = average(
            assignments
              .filter(({ role }) => role === SquadRole.STARTER)
              .map(({ overall }) => overall),
          );

          let squadId: string;

          if (participant.squad) {
            const updated = await transactionClient.squad.updateMany({
              where: {
                id: participant.squad.id,
                version: dto.version,
                isLocked: false,
              },
              data: {
                name: dto.name.trim(),
                formationId: formation.id,
                managerId: manager.id,
                overallRating,
                version: {
                  increment: 1,
                },
              },
            });

            if (updated.count !== 1) {
              throw new ConflictException(
                'This squad draft changed while it was being saved.',
              );
            }

            squadId = participant.squad.id;

            await transactionClient.squadPlayer.deleteMany({
              where: {
                squadId,
              },
            });
          } else {
            const created = await transactionClient.squad.create({
              data: {
                participantId: participant.id,
                formationId: formation.id,
                managerId: manager.id,
                name: dto.name.trim(),
                chemistry: 0,
                overallRating,
                version: 1,
              },
              select: {
                id: true,
              },
            });

            squadId = created.id;
          }

          if (assignments.length > 0) {
            await transactionClient.squadPlayer.createMany({
              data: assignments.map(({ overall: _overall, ...assignment }) => ({
                ...assignment,
                squadId,
              })),
            });
          }

          const savedSquad = await transactionClient.squad.findUniqueOrThrow({
            where: {
              id: squadId,
            },
            select: squadSelect,
          });

          return squadResponse(savedSquad);
        },
        {
          isolationLevel: 'Serializable',
        },
      );
    } catch (error: unknown) {
      if (
        isPrismaErrorCode(error, 'P2002') ||
        isPrismaErrorCode(error, 'P2004') ||
        isPrismaErrorCode(error, 'P2034')
      ) {
        throw new ConflictException(
          'The squad draft conflicted with another update. Reload and try again.',
        );
      }

      throw error;
    }
  }
}
