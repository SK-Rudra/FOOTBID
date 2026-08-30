import { randomInt } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import {
  MatchStatus,
  ParticipantSide,
  ParticipantStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const MAX_MATCH_PARTICIPANTS = 2;
const ROOM_CODE_LENGTH = 8;
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const activeMatchStatuses = [
  MatchStatus.WAITING,
  MatchStatus.AUCTION,
  MatchStatus.SQUAD_BUILDING,
  MatchStatus.READY,
  MatchStatus.IN_PROGRESS,
];

const matchLobbySelect = {
  id: true,
  roomCode: true,
  createdById: true,
  status: true,
  budgetPerParticipant: true,
  createdAt: true,
  updatedAt: true,
  participants: {
    orderBy: {
      joinedAt: 'asc',
    },
    select: {
      id: true,
      userId: true,
      side: true,
      status: true,
      joinedAt: true,
      user: {
        select: {
          username: true,
          displayName: true,
        },
      },
    },
  },
} as const;

type MatchLobbyRecord = Prisma.MatchGetPayload<{
  select: typeof matchLobbySelect;
}>;

function matchLobbyResponse(match: MatchLobbyRecord, userId: string) {
  return {
    id: match.id,
    roomCode: match.roomCode,
    status: match.status,
    budgetPerParticipant: match.budgetPerParticipant,
    isHost: match.createdById === userId,
    isFull: match.participants.length >= MAX_MATCH_PARTICIPANTS,
    availableSlots: Math.max(
      0,
      MAX_MATCH_PARTICIPANTS - match.participants.length,
    ),
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
    participants: match.participants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      username: participant.user.username,
      displayName: participant.user.displayName,
      side: participant.side,
      status: participant.status,
      joinedAt: participant.joinedAt,
      isHost: participant.userId === match.createdById,
    })),
  };
}

export type MatchLobbyResponse = ReturnType<typeof matchLobbyResponse>;

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMatch(userId: string): Promise<MatchLobbyResponse> {
    const roomCode = await this.generateUniqueRoomCode();

    const match = await this.prisma.$transaction(
      async (transactionClient) => {
        const activeParticipant =
          await transactionClient.matchParticipant.findFirst({
            where: {
              userId,
              status: {
                not: ParticipantStatus.LEFT,
              },
              match: {
                status: {
                  in: activeMatchStatuses,
                },
              },
            },
            select: {
              matchId: true,
            },
          });

        if (activeParticipant) {
          throw new ConflictException(
            'Leave or finish your current match before creating another one.',
          );
        }

        return transactionClient.match.create({
          data: {
            roomCode,
            createdById: userId,
            status: MatchStatus.WAITING,
            participants: {
              create: {
                userId,
                side: ParticipantSide.PLAYER_ONE,
                status: ParticipantStatus.CONNECTED,
              },
            },
          },
          select: matchLobbySelect,
        });
      },
      {
        isolationLevel: 'Serializable',
      },
    );

    return matchLobbyResponse(match, userId);
  }

  async joinMatch(
    userId: string,
    roomCode: string,
  ): Promise<MatchLobbyResponse> {
    const match = await this.prisma.$transaction(
      async (transactionClient) => {
        const targetMatch = await transactionClient.match.findUnique({
          where: {
            roomCode,
          },
          select: matchLobbySelect,
        });

        if (!targetMatch) {
          throw new NotFoundException('Match room not found.');
        }

        const existingParticipant = targetMatch.participants.find(
          (participant) => participant.userId === userId,
        );

        if (existingParticipant) {
          return targetMatch;
        }

        if (targetMatch.status !== MatchStatus.WAITING) {
          throw new ConflictException(
            'This match is no longer accepting participants.',
          );
        }

        if (targetMatch.participants.length >= MAX_MATCH_PARTICIPANTS) {
          throw new ConflictException('This match room is already full.');
        }

        const activeParticipant =
          await transactionClient.matchParticipant.findFirst({
            where: {
              userId,
              matchId: {
                not: targetMatch.id,
              },
              status: {
                not: ParticipantStatus.LEFT,
              },
              match: {
                status: {
                  in: activeMatchStatuses,
                },
              },
            },
            select: {
              matchId: true,
            },
          });

        if (activeParticipant) {
          throw new ConflictException(
            'Leave or finish your current match before joining another one.',
          );
        }

        await transactionClient.matchParticipant.create({
          data: {
            matchId: targetMatch.id,
            userId,
            side: ParticipantSide.PLAYER_TWO,
            status: ParticipantStatus.CONNECTED,
            startingBudget: targetMatch.budgetPerParticipant,
            availableBudget: targetMatch.budgetPerParticipant,
          },
        });

        return transactionClient.match.update({
          where: {
            id: targetMatch.id,
          },
          data: {
            status: MatchStatus.AUCTION,
          },
          select: matchLobbySelect,
        });
      },
      {
        isolationLevel: 'Serializable',
      },
    );

    return matchLobbyResponse(match, userId);
  }

  async getCurrentMatch(userId: string): Promise<MatchLobbyResponse | null> {
    const participant = await this.prisma.matchParticipant.findFirst({
      where: {
        userId,
        status: {
          not: ParticipantStatus.LEFT,
        },
        match: {
          status: {
            in: activeMatchStatuses,
          },
        },
      },
      orderBy: {
        joinedAt: 'desc',
      },
      select: {
        match: {
          select: matchLobbySelect,
        },
      },
    });

    return participant ? matchLobbyResponse(participant.match, userId) : null;
  }

  async getMatch(matchId: string, userId: string): Promise<MatchLobbyResponse> {
    const match = await this.prisma.match.findUnique({
      where: {
        id: matchId,
      },
      select: matchLobbySelect,
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    const isParticipant = match.participants.some(
      (participant) => participant.userId === userId,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this match.');
    }

    return matchLobbyResponse(match, userId);
  }

  private async generateUniqueRoomCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const roomCode = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
      ).join('');

      const existingMatch = await this.prisma.match.findUnique({
        where: {
          roomCode,
        },
        select: {
          id: true,
        },
      });

      if (!existingMatch) {
        return roomCode;
      }
    }

    throw new ServiceUnavailableException(
      'A unique match room could not be created. Please try again.',
    );
  }
}
