import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuctionStatus,
  MatchStatus,
  ParticipantStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const unfinishedAuctionStatuses = [
  AuctionStatus.WAITING,
  AuctionStatus.ACTIVE,
  AuctionStatus.LAST_CALL,
];

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
}
