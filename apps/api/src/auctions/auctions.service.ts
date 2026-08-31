import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import {
  AuctionEventType,
  AuctionStatus,
  AuctionType,
  MatchStatus,
  ParticipantStatus,
} from '../generated/prisma/enums.js';
import { BudgetsService } from '../budgets/budgets.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AUCTION_LAST_CALL_SECONDS,
  AUCTION_MAX_PRICE,
  AUCTION_SERIALIZABLE_RETRIES,
} from './auction.constants.js';
import type {
  AuctionHistoryQueryDto,
  AuctionListQueryDto,
} from './dto/auction-query.dto.js';
import type { CreateManagerAuctionDto } from './dto/create-manager-auction.dto.js';
import type { CreatePlayerAuctionDto } from './dto/create-auction.dto.js';
import type { PlaceBidDto } from './dto/place-bid.dto.js';
import type { StartAuctionDto } from './dto/start-auction.dto.js';

const participantSummarySelect = {
  id: true,
  userId: true,
  user: {
    select: {
      username: true,
      displayName: true,
    },
  },
} as const;

const auctionDetailSelect = {
  id: true,
  matchId: true,
  playerId: true,
  managerId: true,
  type: true,
  status: true,
  openingPrice: true,
  currentPrice: true,
  minimumIncrement: true,
  version: true,
  startsAt: true,
  endsAt: true,
  lastCallAt: true,
  soldAt: true,
  createdAt: true,
  updatedAt: true,
  match: {
    select: {
      roomCode: true,
      status: true,
      createdById: true,
    },
  },
  player: {
    select: {
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
    },
  },
  manager: {
    select: {
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
      club: {
        select: {
          id: true,
          name: true,
          shortName: true,
        },
      },
    },
  },
  nominatedByParticipant: {
    select: participantSummarySelect,
  },
  winnerParticipant: {
    select: participantSummarySelect,
  },
  bids: {
    select: {
      id: true,
      participantId: true,
      amount: true,
      sequence: true,
      auctionVersion: true,
      createdAt: true,
      participant: {
        select: participantSummarySelect,
      },
    },
    orderBy: {
      sequence: 'desc',
    },
    take: 1,
  },
  _count: {
    select: {
      bids: true,
    },
  },
} as const;

const auctionEventSelect = {
  id: true,
  auctionId: true,
  participantId: true,
  type: true,
  sequence: true,
  auctionVersion: true,
  statusAfter: true,
  amount: true,
  payload: true,
  createdAt: true,
  participant: {
    select: participantSummarySelect,
  },
} as const;

type AuctionDetailRecord = Prisma.AuctionGetPayload<{
  select: typeof auctionDetailSelect;
}>;

type AuctionEventRecord = Prisma.AuctionEventGetPayload<{
  select: typeof auctionEventSelect;
}>;

function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  );
}

function isTerminalAuctionStatus(status: AuctionStatus): boolean {
  return (
    status === AuctionStatus.SOLD ||
    status === AuctionStatus.UNSOLD ||
    status === AuctionStatus.CANCELLED
  );
}

function participantResponse(
  participant: AuctionDetailRecord['nominatedByParticipant'],
) {
  return {
    id: participant.id,
    userId: participant.userId,
    username: participant.user.username,
    displayName: participant.user.displayName,
  };
}

function auctionResponse(auction: AuctionDetailRecord) {
  const highestBid = auction.bids[0] ?? null;

  const nextBidAmount = highestBid
    ? highestBid.amount + auction.minimumIncrement
    : auction.openingPrice;

  return {
    id: auction.id,
    matchId: auction.matchId,
    roomCode: auction.match.roomCode,
    matchStatus: auction.match.status,
    playerId: auction.playerId,
    managerId: auction.managerId,
    type: auction.type,
    status: auction.status,
    openingPrice: auction.openingPrice,
    currentPrice: auction.currentPrice,
    minimumIncrement: auction.minimumIncrement,
    minimumNextBid:
      !isTerminalAuctionStatus(auction.status) &&
      nextBidAmount <= AUCTION_MAX_PRICE
        ? nextBidAmount
        : null,
    version: auction.version,
    startsAt: auction.startsAt,
    endsAt: auction.endsAt,
    lastCallAt: auction.lastCallAt,
    soldAt: auction.soldAt,
    createdAt: auction.createdAt,
    updatedAt: auction.updatedAt,
    serverTime: new Date(),
    player: auction.player,
    manager: auction.manager,
    nominatedBy: participantResponse(auction.nominatedByParticipant),
    winner: auction.winnerParticipant
      ? participantResponse(auction.winnerParticipant)
      : null,
    highestBid: highestBid
      ? {
          id: highestBid.id,
          participantId: highestBid.participantId,
          amount: highestBid.amount,
          sequence: highestBid.sequence,
          auctionVersion: highestBid.auctionVersion,
          createdAt: highestBid.createdAt,
          bidder: participantResponse(highestBid.participant),
        }
      : null,
    bidCount: auction._count.bids,
  };
}

function auctionEventResponse(event: AuctionEventRecord) {
  return {
    id: event.id,
    auctionId: event.auctionId,
    participantId: event.participantId,
    type: event.type,
    sequence: event.sequence,
    auctionVersion: event.auctionVersion,
    statusAfter: event.statusAfter,
    amount: event.amount,
    payload: event.payload,
    createdAt: event.createdAt,
    participant: event.participant
      ? participantResponse(event.participant)
      : null,
  };
}

export type AuctionResponse = ReturnType<typeof auctionResponse>;

export interface AuctionMutationResult {
  auction: AuctionResponse;
  eventType: AuctionEventType;
  replayed: boolean;
}

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetsService: BudgetsService,
  ) {}

  async createPlayerAuction(
    matchId: string,
    userId: string,
    dto: CreatePlayerAuctionDto,
  ): Promise<AuctionMutationResult> {
    try {
      return await this.withSerializableRetry(async (transactionClient) => {
        const match = await transactionClient.match.findUnique({
          where: {
            id: matchId,
          },
          select: {
            id: true,
            createdById: true,
            status: true,
          },
        });

        if (!match) {
          throw new NotFoundException('Match not found.');
        }

        if (match.createdById !== userId) {
          throw new ForbiddenException(
            'Only the match host can nominate a player.',
          );
        }

        if (
          match.status !== MatchStatus.WAITING &&
          match.status !== MatchStatus.AUCTION
        ) {
          throw new ConflictException(
            'This match is not accepting player nominations.',
          );
        }

        const participant = await this.requireParticipant(
          transactionClient,
          matchId,
          userId,
        );

        const player = await transactionClient.player.findFirst({
          where: {
            id: dto.playerId,
            isActive: true,
          },
          select: {
            id: true,
          },
        });

        if (!player) {
          throw new NotFoundException('Active player not found.');
        }

        const existingOwnership =
          await transactionClient.playerOwnership.findUnique({
            where: {
              matchId_playerId: {
                matchId,
                playerId: player.id,
              },
            },
            select: {
              id: true,
            },
          });

        if (existingOwnership) {
          throw new ConflictException(
            'This player is already owned in the match.',
          );
        }

        const openAuction = await transactionClient.auction.findFirst({
          where: {
            matchId,
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

        if (openAuction) {
          throw new ConflictException(
            'The match already has an unfinished auction.',
          );
        }

        const auction = await transactionClient.auction.create({
          data: {
            matchId,
            playerId: player.id,
            nominatedByParticipantId: participant.id,
            type: AuctionType.PLAYER,
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

        await transactionClient.auctionEvent.create({
          data: {
            auctionId: auction.id,
            participantId: participant.id,
            type: AuctionEventType.NOMINATED,
            sequence: 1,
            auctionVersion: 0,
            statusAfter: AuctionStatus.WAITING,
            amount: dto.openingPrice,
            payload: {
              playerId: player.id,
              minimumIncrement: dto.minimumIncrement,
            },
          },
        });

        const createdAuction =
          await transactionClient.auction.findUniqueOrThrow({
            where: {
              id: auction.id,
            },
            select: auctionDetailSelect,
          });

        return {
          auction: auctionResponse(createdAuction),
          eventType: AuctionEventType.NOMINATED,
          replayed: false,
        };
      });
    } catch (error: unknown) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException(
          'This player has already been nominated in the match.',
        );
      }

      throw error;
    }
  }

  async createManagerAuction(
    matchId: string,
    userId: string,
    dto: CreateManagerAuctionDto,
  ): Promise<AuctionMutationResult> {
    try {
      return await this.withSerializableRetry(async (transactionClient) => {
        const match = await transactionClient.match.findUnique({
          where: {
            id: matchId,
          },
          select: {
            id: true,
            createdById: true,
            status: true,
          },
        });

        if (!match) {
          throw new NotFoundException('Match not found.');
        }

        if (match.createdById !== userId) {
          throw new ForbiddenException(
            'Only the match host can nominate a manager.',
          );
        }

        if (
          match.status !== MatchStatus.WAITING &&
          match.status !== MatchStatus.AUCTION
        ) {
          throw new ConflictException(
            'This match is not accepting manager nominations.',
          );
        }

        const participant = await this.requireParticipant(
          transactionClient,
          matchId,
          userId,
        );

        const manager = await transactionClient.manager.findFirst({
          where: {
            id: dto.managerId,
            isActive: true,
            isNeutral: false,
          },
          select: {
            id: true,
          },
        });

        if (!manager) {
          throw new NotFoundException('Active auctionable manager not found.');
        }

        const existingOwnership =
          await transactionClient.managerOwnership.findUnique({
            where: {
              matchId_managerId: {
                matchId,
                managerId: manager.id,
              },
            },
            select: {
              id: true,
            },
          });

        if (existingOwnership) {
          throw new ConflictException(
            'This manager is already owned in the match.',
          );
        }

        const openAuction = await transactionClient.auction.findFirst({
          where: {
            matchId,
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

        if (openAuction) {
          throw new ConflictException(
            'The match already has an unfinished auction.',
          );
        }

        const auction = await transactionClient.auction.create({
          data: {
            matchId,
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

        await transactionClient.auctionEvent.create({
          data: {
            auctionId: auction.id,
            participantId: participant.id,
            type: AuctionEventType.NOMINATED,
            sequence: 1,
            auctionVersion: 0,
            statusAfter: AuctionStatus.WAITING,
            amount: dto.openingPrice,
            payload: {
              managerId: manager.id,
              minimumIncrement: dto.minimumIncrement,
            },
          },
        });

        const createdAuction =
          await transactionClient.auction.findUniqueOrThrow({
            where: {
              id: auction.id,
            },
            select: auctionDetailSelect,
          });

        return {
          auction: auctionResponse(createdAuction),
          eventType: AuctionEventType.NOMINATED,
          replayed: false,
        };
      });
    } catch (error: unknown) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException(
          'This manager has already been nominated in the match.',
        );
      }

      throw error;
    }
  }
  async startAuction(
    auctionId: string,
    userId: string,
    dto: StartAuctionDto,
  ): Promise<AuctionMutationResult> {
    return this.withSerializableRetry(async (transactionClient) => {
      const auction = await transactionClient.auction.findUnique({
        where: {
          id: auctionId,
        },
        select: {
          id: true,
          matchId: true,
          type: true,
          status: true,
          version: true,
          match: {
            select: {
              createdById: true,
              status: true,
            },
          },
        },
      });

      if (!auction) {
        throw new NotFoundException('Auction not found.');
      }

      if (auction.match.createdById !== userId) {
        throw new ForbiddenException(
          'Only the match host can start the auction.',
        );
      }

      const participant = await this.requireParticipant(
        transactionClient,
        auction.matchId,
        userId,
      );

      if (auction.type !== AuctionType.PLAYER) {
        throw new BadRequestException(
          'Only player auctions are supported in this phase.',
        );
      }

      if (auction.status !== AuctionStatus.WAITING) {
        throw new ConflictException('Only a waiting auction can be started.');
      }

      if (
        auction.match.status !== MatchStatus.WAITING &&
        auction.match.status !== MatchStatus.AUCTION
      ) {
        throw new ConflictException('This match cannot start an auction.');
      }

      const competingAuction = await transactionClient.auction.findFirst({
        where: {
          matchId: auction.matchId,
          id: {
            not: auction.id,
          },
          status: {
            in: [AuctionStatus.ACTIVE, AuctionStatus.LAST_CALL],
          },
        },
        select: {
          id: true,
        },
      });

      if (competingAuction) {
        throw new ConflictException(
          'Another auction is already live in this match.',
        );
      }

      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + dto.durationSeconds * 1_000);
      const nextVersion = auction.version + 1;

      const updateResult = await transactionClient.auction.updateMany({
        where: {
          id: auction.id,
          status: AuctionStatus.WAITING,
          version: auction.version,
        },
        data: {
          status: AuctionStatus.ACTIVE,
          startsAt,
          endsAt,
          lastCallAt: null,
          version: nextVersion,
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException(
          'The auction changed before it could be started.',
        );
      }

      await transactionClient.match.update({
        where: {
          id: auction.matchId,
        },
        data: {
          status: MatchStatus.AUCTION,
        },
      });

      const eventSequence = await this.nextEventSequence(
        transactionClient,
        auction.id,
      );

      await transactionClient.auctionEvent.create({
        data: {
          auctionId: auction.id,
          participantId: participant.id,
          type: AuctionEventType.STARTED,
          sequence: eventSequence,
          auctionVersion: nextVersion,
          statusAfter: AuctionStatus.ACTIVE,
          payload: {
            durationSeconds: dto.durationSeconds,
            endsAt: endsAt.toISOString(),
          },
        },
      });

      const startedAuction = await transactionClient.auction.findUniqueOrThrow({
        where: {
          id: auction.id,
        },
        select: auctionDetailSelect,
      });

      return {
        auction: auctionResponse(startedAuction),
        eventType: AuctionEventType.STARTED,
        replayed: false,
      };
    });
  }

  async placeBid(
    auctionId: string,
    userId: string,
    dto: PlaceBidDto,
  ): Promise<AuctionMutationResult> {
    const idempotencyKey = dto.idempotencyKey.trim();

    try {
      return await this.withSerializableRetry(async (transactionClient) => {
        const auction = await transactionClient.auction.findUnique({
          where: {
            id: auctionId,
          },
          select: {
            id: true,
            matchId: true,
            playerId: true,
            managerId: true,
            type: true,
            status: true,
            openingPrice: true,
            currentPrice: true,
            minimumIncrement: true,
            version: true,
            endsAt: true,
            match: {
              select: {
                status: true,
              },
            },
          },
        });

        if (!auction) {
          throw new NotFoundException('Auction not found.');
        }

        const participant = await this.requireParticipant(
          transactionClient,
          auction.matchId,
          userId,
        );

        const existingBid = await transactionClient.bid.findUnique({
          where: {
            auctionId_participantId_idempotencyKey: {
              auctionId: auction.id,
              participantId: participant.id,
              idempotencyKey,
            },
          },
          select: {
            amount: true,
          },
        });

        if (existingBid) {
          if (existingBid.amount !== dto.amount) {
            throw new ConflictException(
              'This idempotency key was already used for a different bid.',
            );
          }

          const replayedAuction =
            await transactionClient.auction.findUniqueOrThrow({
              where: {
                id: auction.id,
              },
              select: auctionDetailSelect,
            });

          return {
            auction: auctionResponse(replayedAuction),
            eventType: AuctionEventType.BID_PLACED,
            replayed: true,
          };
        }

        if (auction.type !== AuctionType.PLAYER || !auction.playerId) {
          throw new BadRequestException(
            'Only player auctions are supported in this phase.',
          );
        }

        if (
          auction.status !== AuctionStatus.ACTIVE &&
          auction.status !== AuctionStatus.LAST_CALL
        ) {
          throw new ConflictException('This auction is not accepting bids.');
        }

        if (auction.match.status !== MatchStatus.AUCTION) {
          throw new ConflictException(
            'The match is not currently in its auction phase.',
          );
        }

        const now = new Date();

        if (!auction.endsAt || auction.endsAt.getTime() <= now.getTime()) {
          throw new ConflictException('The auction bidding period has ended.');
        }

        const highestBid = await transactionClient.bid.findFirst({
          where: {
            auctionId: auction.id,
          },
          select: {
            participantId: true,
            amount: true,
            sequence: true,
          },
          orderBy: {
            sequence: 'desc',
          },
        });

        const minimumBid = highestBid
          ? highestBid.amount + auction.minimumIncrement
          : auction.openingPrice;

        if (minimumBid > AUCTION_MAX_PRICE) {
          throw new ConflictException(
            'The auction has reached the maximum permitted price.',
          );
        }

        if (dto.amount < minimumBid) {
          throw new BadRequestException(
            `The minimum valid bid is €${minimumBid}.`,
          );
        }

        const nextBidSequence = (highestBid?.sequence ?? 0) + 1;

        if (highestBid?.participantId === participant.id) {
          const additionalReservation = dto.amount - highestBid.amount;

          await this.budgetsService.reserveFundsInTransaction(
            transactionClient,
            {
              participantId: participant.id,
              auctionId: auction.id,
              amount: additionalReservation,
              idempotencyKey: `auction:${auction.id}:bid:${idempotencyKey}:reserve`,
              description: `Additional reservation for bid ${nextBidSequence}.`,
            },
          );
        } else {
          if (highestBid) {
            await this.budgetsService.releaseFundsInTransaction(
              transactionClient,
              {
                participantId: highestBid.participantId,
                auctionId: auction.id,
                amount: highestBid.amount,
                idempotencyKey: `auction:${auction.id}:outbid:${nextBidSequence}:release`,
                description: `Released after being outbid by bid ${nextBidSequence}.`,
              },
            );
          }

          await this.budgetsService.reserveFundsInTransaction(
            transactionClient,
            {
              participantId: participant.id,
              auctionId: auction.id,
              amount: dto.amount,
              idempotencyKey: `auction:${auction.id}:bid:${idempotencyKey}:reserve`,
              description: `Reservation for bid ${nextBidSequence}.`,
            },
          );
        }

        const nextVersion = auction.version + 1;

        const updateResult = await transactionClient.auction.updateMany({
          where: {
            id: auction.id,
            version: auction.version,
            status: auction.status,
          },
          data: {
            currentPrice: dto.amount,
            version: nextVersion,
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'A competing bid changed the auction. Please bid again.',
          );
        }

        await transactionClient.bid.create({
          data: {
            auctionId: auction.id,
            participantId: participant.id,
            amount: dto.amount,
            sequence: nextBidSequence,
            idempotencyKey,
            auctionVersion: nextVersion,
          },
        });

        const eventSequence = await this.nextEventSequence(
          transactionClient,
          auction.id,
        );

        await transactionClient.auctionEvent.create({
          data: {
            auctionId: auction.id,
            participantId: participant.id,
            type: AuctionEventType.BID_PLACED,
            sequence: eventSequence,
            auctionVersion: nextVersion,
            statusAfter: auction.status,
            amount: dto.amount,
            payload: {
              bidSequence: nextBidSequence,
            },
          },
        });

        const updatedAuction =
          await transactionClient.auction.findUniqueOrThrow({
            where: {
              id: auction.id,
            },
            select: auctionDetailSelect,
          });

        return {
          auction: auctionResponse(updatedAuction),
          eventType: AuctionEventType.BID_PLACED,
          replayed: false,
        };
      });
    } catch (error: unknown) {
      if (isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException(
          'This bid was already accepted or another bid won the race.',
        );
      }

      throw error;
    }
  }

  async cancelAuction(
    auctionId: string,
    userId: string,
  ): Promise<AuctionMutationResult> {
    return this.withSerializableRetry(async (transactionClient) => {
      const auction = await transactionClient.auction.findUnique({
        where: {
          id: auctionId,
        },
        select: {
          id: true,
          matchId: true,
          status: true,
          version: true,
          match: {
            select: {
              createdById: true,
            },
          },
        },
      });

      if (!auction) {
        throw new NotFoundException('Auction not found.');
      }

      if (auction.match.createdById !== userId) {
        throw new ForbiddenException(
          'Only the match host can cancel the auction.',
        );
      }

      const participant = await this.requireParticipant(
        transactionClient,
        auction.matchId,
        userId,
      );

      if (auction.status === AuctionStatus.CANCELLED) {
        const replayedAuction =
          await transactionClient.auction.findUniqueOrThrow({
            where: {
              id: auction.id,
            },
            select: auctionDetailSelect,
          });

        return {
          auction: auctionResponse(replayedAuction),
          eventType: AuctionEventType.CANCELLED,
          replayed: true,
        };
      }

      if (
        auction.status === AuctionStatus.SOLD ||
        auction.status === AuctionStatus.UNSOLD
      ) {
        throw new ConflictException('A completed auction cannot be cancelled.');
      }

      const highestBid = await transactionClient.bid.findFirst({
        where: {
          auctionId: auction.id,
        },
        select: {
          participantId: true,
          amount: true,
        },
        orderBy: {
          sequence: 'desc',
        },
      });

      if (highestBid) {
        await this.budgetsService.releaseFundsInTransaction(transactionClient, {
          participantId: highestBid.participantId,
          auctionId: auction.id,
          amount: highestBid.amount,
          idempotencyKey: `auction:${auction.id}:cancel:release`,
          description: 'Released because the auction was cancelled.',
        });
      }

      const nextVersion = auction.version + 1;
      const now = new Date();

      const updateResult = await transactionClient.auction.updateMany({
        where: {
          id: auction.id,
          version: auction.version,
          status: auction.status,
        },
        data: {
          status: AuctionStatus.CANCELLED,
          endsAt: now,
          version: nextVersion,
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException(
          'The auction changed before it could be cancelled.',
        );
      }

      const eventSequence = await this.nextEventSequence(
        transactionClient,
        auction.id,
      );

      await transactionClient.auctionEvent.create({
        data: {
          auctionId: auction.id,
          participantId: participant.id,
          type: AuctionEventType.CANCELLED,
          sequence: eventSequence,
          auctionVersion: nextVersion,
          statusAfter: AuctionStatus.CANCELLED,
        },
      });

      const cancelledAuction =
        await transactionClient.auction.findUniqueOrThrow({
          where: {
            id: auction.id,
          },
          select: auctionDetailSelect,
        });

      return {
        auction: auctionResponse(cancelledAuction),
        eventType: AuctionEventType.CANCELLED,
        replayed: false,
      };
    });
  }

  async getAuctionForUser(auctionId: string, userId: string) {
    const auctionIdentity = await this.prisma.auction.findUnique({
      where: {
        id: auctionId,
      },
      select: {
        matchId: true,
      },
    });

    if (!auctionIdentity) {
      throw new NotFoundException('Auction not found.');
    }

    await this.requireParticipantForRead(auctionIdentity.matchId, userId);

    const auction = await this.prisma.auction.findUniqueOrThrow({
      where: {
        id: auctionId,
      },
      select: auctionDetailSelect,
    });

    return auctionResponse(auction);
  }

  async listMatchAuctionsForUser(
    matchId: string,
    userId: string,
    query: AuctionListQueryDto,
  ) {
    await this.requireParticipantForRead(matchId, userId);

    const where: Prisma.AuctionWhereInput = {
      matchId,
      ...(query.status
        ? {
            status: query.status,
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [auctions, total] = await this.prisma.$transaction([
      this.prisma.auction.findMany({
        where,
        select: auctionDetailSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.auction.count({
        where,
      }),
    ]);

    return {
      data: auctions.map(auctionResponse),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async listAuctionHistoryForUser(
    auctionId: string,
    userId: string,
    query: AuctionHistoryQueryDto,
  ) {
    const auction = await this.prisma.auction.findUnique({
      where: {
        id: auctionId,
      },
      select: {
        matchId: true,
      },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found.');
    }

    await this.requireParticipantForRead(auction.matchId, userId);

    const where: Prisma.AuctionEventWhereInput = {
      auctionId,
      ...(query.type
        ? {
            type: query.type,
          }
        : {}),
    };

    const skip = (query.page - 1) * query.pageSize;

    const [events, total] = await this.prisma.$transaction([
      this.prisma.auctionEvent.findMany({
        where,
        select: auctionEventSelect,
        orderBy: {
          sequence: 'desc',
        },
        skip,
        take: query.pageSize,
      }),
      this.prisma.auctionEvent.count({
        where,
      }),
    ]);

    return {
      data: events.map(auctionEventResponse),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      auctionId,
    };
  }

  async processDueAuctions(now = new Date()): Promise<AuctionMutationResult[]> {
    const lastCallBoundary = new Date(
      now.getTime() + AUCTION_LAST_CALL_SECONDS * 1_000,
    );

    const dueAuctions = await this.prisma.auction.findMany({
      where: {
        OR: [
          {
            status: AuctionStatus.ACTIVE,
            endsAt: {
              lte: lastCallBoundary,
            },
          },
          {
            status: AuctionStatus.LAST_CALL,
            endsAt: {
              lte: now,
            },
          },
        ],
      },
      select: {
        id: true,
      },
      orderBy: {
        endsAt: 'asc',
      },
      take: 100,
    });

    const results: AuctionMutationResult[] = [];

    for (const auction of dueAuctions) {
      try {
        const result = await this.advanceAuctionClock(auction.id, now);

        if (result) {
          results.push(result);
        }
      } catch (error: unknown) {
        const details =
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error);

        this.logger.error(`Failed to advance auction ${auction.id}.`, details);
      }
    }

    return results;
  }

  private async advanceAuctionClock(
    auctionId: string,
    now: Date,
  ): Promise<AuctionMutationResult | null> {
    try {
      return await this.withSerializableRetry(async (transactionClient) => {
        const auction = await transactionClient.auction.findUnique({
          where: {
            id: auctionId,
          },
          select: {
            id: true,
            matchId: true,
            playerId: true,
            managerId: true,
            type: true,
            status: true,
            version: true,
            endsAt: true,
          },
        });

        if (
          !auction ||
          isTerminalAuctionStatus(auction.status) ||
          !auction.endsAt
        ) {
          return null;
        }

        if (auction.endsAt.getTime() <= now.getTime()) {
          return this.settleAuction(transactionClient, auction, now);
        }

        const lastCallStartsAt =
          auction.endsAt.getTime() - AUCTION_LAST_CALL_SECONDS * 1_000;

        if (
          auction.status !== AuctionStatus.ACTIVE ||
          now.getTime() < lastCallStartsAt
        ) {
          return null;
        }

        const nextVersion = auction.version + 1;

        const updateResult = await transactionClient.auction.updateMany({
          where: {
            id: auction.id,
            status: AuctionStatus.ACTIVE,
            version: auction.version,
          },
          data: {
            status: AuctionStatus.LAST_CALL,
            lastCallAt: now,
            version: nextVersion,
          },
        });

        if (updateResult.count !== 1) {
          throw new ConflictException(
            'The auction changed during its last-call transition.',
          );
        }

        const eventSequence = await this.nextEventSequence(
          transactionClient,
          auction.id,
        );

        await transactionClient.auctionEvent.create({
          data: {
            auctionId: auction.id,
            type: AuctionEventType.LAST_CALL,
            sequence: eventSequence,
            auctionVersion: nextVersion,
            statusAfter: AuctionStatus.LAST_CALL,
          },
        });

        const updatedAuction =
          await transactionClient.auction.findUniqueOrThrow({
            where: {
              id: auction.id,
            },
            select: auctionDetailSelect,
          });

        return {
          auction: auctionResponse(updatedAuction),
          eventType: AuctionEventType.LAST_CALL,
          replayed: false,
        };
      });
    } catch (error: unknown) {
      if (isPrismaErrorCode(error, 'P2002')) {
        return null;
      }

      throw error;
    }
  }

  private async settleAuction(
    transactionClient: Prisma.TransactionClient,
    auction: {
      id: string;
      matchId: string;
      playerId: string | null;
      type: AuctionType;
      status: AuctionStatus;
      version: number;
      endsAt: Date | null;
    },
    now: Date,
  ): Promise<AuctionMutationResult> {
    const highestBid = await transactionClient.bid.findFirst({
      where: {
        auctionId: auction.id,
      },
      select: {
        participantId: true,
        amount: true,
      },
      orderBy: {
        sequence: 'desc',
      },
    });

    const nextVersion = auction.version + 1;
    const eventSequence = await this.nextEventSequence(
      transactionClient,
      auction.id,
    );

    if (!highestBid) {
      const updateResult = await transactionClient.auction.updateMany({
        where: {
          id: auction.id,
          status: auction.status,
          version: auction.version,
        },
        data: {
          status: AuctionStatus.UNSOLD,
          version: nextVersion,
        },
      });

      if (updateResult.count !== 1) {
        throw new ConflictException(
          'The auction changed before it could be settled.',
        );
      }

      await transactionClient.auctionEvent.create({
        data: {
          auctionId: auction.id,
          type: AuctionEventType.UNSOLD,
          sequence: eventSequence,
          auctionVersion: nextVersion,
          statusAfter: AuctionStatus.UNSOLD,
        },
      });

      const unsoldAuction = await transactionClient.auction.findUniqueOrThrow({
        where: {
          id: auction.id,
        },
        select: auctionDetailSelect,
      });

      return {
        auction: auctionResponse(unsoldAuction),
        eventType: AuctionEventType.UNSOLD,
        replayed: false,
      };
    }

    if (auction.type !== AuctionType.PLAYER || !auction.playerId) {
      throw new ConflictException(
        'The auction does not contain a valid player.',
      );
    }

    await this.budgetsService.purchaseReservedFundsInTransaction(
      transactionClient,
      {
        participantId: highestBid.participantId,
        auctionId: auction.id,
        amount: highestBid.amount,
        itemType: AuctionType.PLAYER,
        itemId: auction.playerId,
        idempotencyKey: `auction:${auction.id}:purchase`,
        description: 'Player purchased through the auction.',
      },
    );

    await transactionClient.playerOwnership.create({
      data: {
        matchId: auction.matchId,
        participantId: highestBid.participantId,
        playerId: auction.playerId,
        auctionId: auction.id,
        acquisitionPrice: highestBid.amount,
        acquiredAt: now,
      },
    });

    const updateResult = await transactionClient.auction.updateMany({
      where: {
        id: auction.id,
        status: auction.status,
        version: auction.version,
      },
      data: {
        status: AuctionStatus.SOLD,
        winnerParticipantId: highestBid.participantId,
        currentPrice: highestBid.amount,
        soldAt: now,
        version: nextVersion,
      },
    });

    if (updateResult.count !== 1) {
      throw new ConflictException(
        'The auction changed before the sale could be recorded.',
      );
    }

    await transactionClient.auctionEvent.create({
      data: {
        auctionId: auction.id,
        participantId: highestBid.participantId,
        type: AuctionEventType.SOLD,
        sequence: eventSequence,
        auctionVersion: nextVersion,
        statusAfter: AuctionStatus.SOLD,
        amount: highestBid.amount,
        payload: {
          playerId: auction.playerId,
        },
      },
    });

    const soldAuction = await transactionClient.auction.findUniqueOrThrow({
      where: {
        id: auction.id,
      },
      select: auctionDetailSelect,
    });

    return {
      auction: auctionResponse(soldAuction),
      eventType: AuctionEventType.SOLD,
      replayed: false,
    };
  }

  private async requireParticipant(
    transactionClient: Prisma.TransactionClient,
    matchId: string,
    userId: string,
  ) {
    const participant = await transactionClient.matchParticipant.findUnique({
      where: {
        matchId_userId: {
          matchId,
          userId,
        },
      },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!participant || participant.status === ParticipantStatus.LEFT) {
      throw new ForbiddenException(
        'You are not an active participant in this match.',
      );
    }

    return participant;
  }

  private async requireParticipantForRead(
    matchId: string,
    userId: string,
  ): Promise<void> {
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

    const participant = await this.prisma.matchParticipant.findUnique({
      where: {
        matchId_userId: {
          matchId,
          userId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!participant || participant.status === ParticipantStatus.LEFT) {
      throw new ForbiddenException(
        'You are not an active participant in this match.',
      );
    }
  }

  private async nextEventSequence(
    transactionClient: Prisma.TransactionClient,
    auctionId: string,
  ): Promise<number> {
    const latestEvent = await transactionClient.auctionEvent.findFirst({
      where: {
        auctionId,
      },
      select: {
        sequence: true,
      },
      orderBy: {
        sequence: 'desc',
      },
    });

    return (latestEvent?.sequence ?? 0) + 1;
  }

  private async withSerializableRetry<T>(
    operation: (transactionClient: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (
      let attempt = 1;
      attempt <= AUCTION_SERIALIZABLE_RETRIES;
      attempt += 1
    ) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: 'Serializable',
        });
      } catch (error: unknown) {
        const retryable =
          isPrismaErrorCode(error, 'P2034') &&
          attempt < AUCTION_SERIALIZABLE_RETRIES;

        if (!retryable) {
          throw error;
        }
      }
    }

    throw new ConflictException('The auction was too busy. Please try again.');
  }
}
