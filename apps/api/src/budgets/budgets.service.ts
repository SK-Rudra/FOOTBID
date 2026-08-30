import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import {
  AuctionType,
  BudgetTransactionType,
  MatchStatus,
} from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { BudgetHistoryQueryDto } from './dto/wallet-query.dto.js';

const MATCH_BUDGET = 150_000_000;

const walletSelect = {
  id: true,
  matchId: true,
  userId: true,
  startingBudget: true,
  availableBudget: true,
  reservedBudget: true,
  spentBudget: true,
  joinedAt: true,
  updatedAt: true,
  match: {
    select: {
      roomCode: true,
      status: true,
      budgetPerParticipant: true,
      createdAt: true,
    },
  },
} as const;

const walletSnapshotSelect = {
  id: true,
  matchId: true,
  userId: true,
  startingBudget: true,
  availableBudget: true,
  reservedBudget: true,
  spentBudget: true,
} as const;

const budgetTransactionSelect = {
  id: true,
  participantId: true,
  auctionId: true,
  type: true,
  itemType: true,
  itemId: true,
  amount: true,
  availableAfter: true,
  reservedAfter: true,
  spentAfter: true,
  idempotencyKey: true,
  purchaseKey: true,
  description: true,
  createdAt: true,
} as const;

interface WalletRecord {
  id: string;
  matchId: string;
  userId: string;
  startingBudget: number;
  availableBudget: number;
  reservedBudget: number;
  spentBudget: number;
  joinedAt: Date;
  updatedAt: Date;
  match: {
    roomCode: string;
    status: MatchStatus;
    budgetPerParticipant: number;
    createdAt: Date;
  };
}

interface WalletSnapshot {
  id: string;
  matchId: string;
  userId: string;
  startingBudget: number;
  availableBudget: number;
  reservedBudget: number;
  spentBudget: number;
}

interface BudgetTransactionRecord {
  id: string;
  participantId: string;
  auctionId: string | null;
  type: BudgetTransactionType;
  itemType: AuctionType | null;
  itemId: string | null;
  amount: number;
  availableAfter: number;
  reservedAfter: number;
  spentAfter: number;
  idempotencyKey: string;
  purchaseKey: string | null;
  description: string | null;
  createdAt: Date;
}

export interface AuctionBudgetOperationInput {
  participantId: string;
  auctionId: string;
  amount: number;
  idempotencyKey: string;
  description?: string;
}

export interface PurchaseBudgetOperationInput extends AuctionBudgetOperationInput {
  itemType: AuctionType;
  itemId: string;
}

type BudgetTransition = 'RESERVE' | 'RELEASE' | 'PURCHASE';

interface InternalBudgetOperationInput extends AuctionBudgetOperationInput {
  itemType?: AuctionType;
  itemId?: string;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function walletResponse(wallet: WalletRecord) {
  return {
    participantId: wallet.id,
    matchId: wallet.matchId,
    roomCode: wallet.match.roomCode,
    matchStatus: wallet.match.status,
    startingBudget: wallet.startingBudget,
    availableBudget: wallet.availableBudget,
    reservedBudget: wallet.reservedBudget,
    spentBudget: wallet.spentBudget,
    remainingBudget: wallet.availableBudget,
    committedBudget: wallet.reservedBudget + wallet.spentBudget,
    budgetPerParticipant: wallet.match.budgetPerParticipant,
    joinedAt: wallet.joinedAt,
    updatedAt: wallet.updatedAt,
  };
}

function snapshotResponse(wallet: WalletSnapshot) {
  return {
    participantId: wallet.id,
    matchId: wallet.matchId,
    startingBudget: wallet.startingBudget,
    availableBudget: wallet.availableBudget,
    reservedBudget: wallet.reservedBudget,
    spentBudget: wallet.spentBudget,
    remainingBudget: wallet.availableBudget,
    committedBudget: wallet.reservedBudget + wallet.spentBudget,
  };
}

function transactionResponse(transaction: BudgetTransactionRecord) {
  return {
    id: transaction.id,
    participantId: transaction.participantId,
    auctionId: transaction.auctionId,
    type: transaction.type,
    itemType: transaction.itemType,
    itemId: transaction.itemId,
    amount: transaction.amount,
    availableAfter: transaction.availableAfter,
    reservedAfter: transaction.reservedAfter,
    spentAfter: transaction.spentAfter,
    description: transaction.description,
    createdAt: transaction.createdAt,
  };
}

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWalletForUser(userId: string, matchId?: string) {
    const wallet = await this.prisma.matchParticipant.findFirst({
      where: {
        userId,
        ...(matchId
          ? {
              matchId,
            }
          : {
              match: {
                status: {
                  notIn: [MatchStatus.COMPLETED, MatchStatus.CANCELLED],
                },
              },
            }),
      },
      select: walletSelect,
      orderBy: {
        joinedAt: 'desc',
      },
    });

    if (!wallet) {
      throw new NotFoundException(
        matchId
          ? 'Wallet not found for this match.'
          : 'No active match wallet found.',
      );
    }

    return walletResponse(wallet);
  }

  async listTransactionsForUser(userId: string, query: BudgetHistoryQueryDto) {
    const wallet = await this.prisma.matchParticipant.findFirst({
      where: {
        userId,
        ...(query.matchId
          ? {
              matchId: query.matchId,
            }
          : {
              match: {
                status: {
                  notIn: [MatchStatus.COMPLETED, MatchStatus.CANCELLED],
                },
              },
            }),
      },
      select: {
        id: true,
        matchId: true,
      },
      orderBy: {
        joinedAt: 'desc',
      },
    });

    if (!wallet) {
      throw new NotFoundException(
        query.matchId
          ? 'Wallet not found for this match.'
          : 'No active match wallet found.',
      );
    }

    const where: Prisma.BudgetTransactionWhereInput = {
      participantId: wallet.id,
      type: query.type,
    };

    const skip = (query.page - 1) * query.pageSize;

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.budgetTransaction.findMany({
        where,
        select: budgetTransactionSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.budgetTransaction.count({ where }),
    ]);

    return {
      data: transactions.map(transactionResponse),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      matchId: wallet.matchId,
      participantId: wallet.id,
    };
  }

  reserveFunds(input: AuctionBudgetOperationInput) {
    return this.executeOperation(
      input,
      BudgetTransactionType.RESERVATION,
      'RESERVE',
    );
  }

  releaseFunds(input: AuctionBudgetOperationInput) {
    return this.executeOperation(
      input,
      BudgetTransactionType.RELEASE,
      'RELEASE',
    );
  }

  purchaseReservedFunds(input: PurchaseBudgetOperationInput) {
    return this.executeOperation(
      input,
      BudgetTransactionType.PURCHASE,
      'PURCHASE',
    );
  }

  private validateOperation(
    input: InternalBudgetOperationInput,
    transactionType: BudgetTransactionType,
  ): void {
    if (
      !Number.isSafeInteger(input.amount) ||
      input.amount <= 0 ||
      input.amount > MATCH_BUDGET
    ) {
      throw new BadRequestException(
        'Budget amount must be a positive integer no greater than €150M.',
      );
    }

    const idempotencyKey = input.idempotencyKey.trim();

    if (idempotencyKey.length === 0 || idempotencyKey.length > 128) {
      throw new BadRequestException('A valid idempotency key is required.');
    }

    if (
      input.description !== undefined &&
      input.description.trim().length > 255
    ) {
      throw new BadRequestException(
        'Budget description cannot exceed 255 characters.',
      );
    }

    if (transactionType === BudgetTransactionType.PURCHASE) {
      if (!input.itemType || !input.itemId?.trim()) {
        throw new BadRequestException(
          'Purchases require an item type and item identifier.',
        );
      }

      if (input.itemId.trim().length > 100) {
        throw new BadRequestException(
          'Purchase item identifier cannot exceed 100 characters.',
        );
      }
    }
  }

  private async executeOperation(
    input: InternalBudgetOperationInput,
    transactionType: BudgetTransactionType,
    transition: BudgetTransition,
  ) {
    this.validateOperation(input, transactionType);

    const idempotencyKey = input.idempotencyKey.trim();
    const itemId = input.itemId?.trim() ?? null;
    const description = input.description?.trim() || null;
    const purchaseKey =
      transactionType === BudgetTransactionType.PURCHASE
        ? `${input.itemType}:${itemId}`
        : null;

    try {
      return await this.prisma.$transaction(async (transactionClient) => {
        const existing = await transactionClient.budgetTransaction.findUnique({
          where: {
            participantId_idempotencyKey: {
              participantId: input.participantId,
              idempotencyKey,
            },
          },
          select: budgetTransactionSelect,
        });

        if (existing) {
          const sameOperation =
            existing.type === transactionType &&
            existing.amount === input.amount &&
            existing.auctionId === input.auctionId &&
            existing.itemType === (input.itemType ?? null) &&
            existing.itemId === itemId;

          if (!sameOperation) {
            throw new ConflictException(
              'This idempotency key was already used for a different budget operation.',
            );
          }

          const replayedWallet =
            await transactionClient.matchParticipant.findUnique({
              where: {
                id: input.participantId,
              },
              select: walletSnapshotSelect,
            });

          if (!replayedWallet) {
            throw new NotFoundException('Match participant wallet not found.');
          }

          return {
            wallet: snapshotResponse(replayedWallet),
            transaction: transactionResponse(existing),
            replayed: true,
          };
        }

        const participant = await transactionClient.matchParticipant.findUnique(
          {
            where: {
              id: input.participantId,
            },
            select: {
              id: true,
              matchId: true,
            },
          },
        );

        if (!participant) {
          throw new NotFoundException('Match participant wallet not found.');
        }

        const auction = await transactionClient.auction.findUnique({
          where: {
            id: input.auctionId,
          },
          select: {
            matchId: true,
          },
        });

        if (!auction || auction.matchId !== participant.matchId) {
          throw new BadRequestException(
            'Auction does not belong to the participant match.',
          );
        }

        let updateResult: { count: number };

        if (transition === 'RESERVE') {
          updateResult = await transactionClient.matchParticipant.updateMany({
            where: {
              id: input.participantId,
              availableBudget: {
                gte: input.amount,
              },
            },
            data: {
              availableBudget: {
                decrement: input.amount,
              },
              reservedBudget: {
                increment: input.amount,
              },
            },
          });
        } else if (transition === 'RELEASE') {
          updateResult = await transactionClient.matchParticipant.updateMany({
            where: {
              id: input.participantId,
              reservedBudget: {
                gte: input.amount,
              },
            },
            data: {
              reservedBudget: {
                decrement: input.amount,
              },
              availableBudget: {
                increment: input.amount,
              },
            },
          });
        } else {
          updateResult = await transactionClient.matchParticipant.updateMany({
            where: {
              id: input.participantId,
              reservedBudget: {
                gte: input.amount,
              },
            },
            data: {
              reservedBudget: {
                decrement: input.amount,
              },
              spentBudget: {
                increment: input.amount,
              },
            },
          });
        }

        if (updateResult.count !== 1) {
          throw new BadRequestException(
            transition === 'RESERVE'
              ? 'Insufficient available budget.'
              : 'Insufficient reserved budget.',
          );
        }

        const updatedWallet =
          await transactionClient.matchParticipant.findUniqueOrThrow({
            where: {
              id: input.participantId,
            },
            select: walletSnapshotSelect,
          });

        const ledgerEntry = await transactionClient.budgetTransaction.create({
          data: {
            participantId: input.participantId,
            auctionId: input.auctionId,
            type: transactionType,
            itemType: input.itemType ?? null,
            itemId,
            amount: input.amount,
            availableAfter: updatedWallet.availableBudget,
            reservedAfter: updatedWallet.reservedBudget,
            spentAfter: updatedWallet.spentBudget,
            idempotencyKey,
            purchaseKey,
            description,
          },
          select: budgetTransactionSelect,
        });

        return {
          wallet: snapshotResponse(updatedWallet),
          transaction: transactionResponse(ledgerEntry),
          replayed: false,
        };
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'This budget operation or purchase has already been recorded.',
        );
      }

      throw error;
    }
  }
}
