import {
  BadRequestException,
  ConflictException,
  type INestApplication,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/application.js';
import { BudgetsService } from '../src/budgets/budgets.service.js';
import {
  AuctionType,
  BudgetTransactionType,
  ParticipantSide,
  PlayerPosition,
  PreferredFoot,
} from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

type SetCookieHeaders = string[] | string | undefined;

function normalizeSetCookieHeaders(headers: SetCookieHeaders): string[] {
  if (!headers) {
    return [];
  }

  return Array.isArray(headers) ? headers : [headers];
}

function findSetCookie(headers: SetCookieHeaders, cookieName: string): string {
  const cookie = normalizeSetCookieHeaders(headers).find((value) =>
    value.startsWith(`${cookieName}=`),
  );

  expect(cookie).toBeDefined();

  if (!cookie) {
    throw new Error(`Missing ${cookieName} Set-Cookie header.`);
  }

  return cookie;
}

function cookiePair(setCookieHeader: string): string {
  const pair = setCookieHeader.split(';', 1)[0];

  if (!pair) {
    throw new Error('Invalid Set-Cookie header.');
  }

  return pair;
}

describe('FOOTBID budget wallet (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let budgetsService: BudgetsService;

  let ownerUserId: string;
  let ownerAccessCookie: string;
  let outsiderAccessCookie: string;

  let matchId: string;
  let participantId: string;
  let auctionId: string;
  let otherAuctionId: string;
  let purchaseTransactionId: string;

  const sourceProvider = 'footbid-phase6-e2e';
  const roomCodes = ['P6WALLET1', 'P6OTHER1'];
  const fixtureEmails = [
    'phase6-wallet-owner@phase6.test',
    'phase6-wallet-outsider@phase6.test',
  ];

  async function removeFixtures(): Promise<void> {
    await prisma.match.deleteMany({
      where: {
        roomCode: {
          in: roomCodes,
        },
      },
    });

    await prisma.player.deleteMany({
      where: {
        sourceProvider,
      },
    });

    await prisma.user.deleteMany({
      where: {
        email: {
          in: fixtureEmails,
        },
      },
    });
  }

  async function registerFixtureUser(input: {
    email: string;
    username: string;
    displayName: string;
  }): Promise<{ userId: string; accessCookie: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        ...input,
        password: 'FootbidPhase6Password1',
      })
      .expect(201);

    const cookies = response.headers['set-cookie'] as SetCookieHeaders;

    return {
      userId: response.body.user.id as string,
      accessCookie: cookiePair(findSetCookie(cookies, 'footbid_access')),
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    prisma = app.get(PrismaService);
    budgetsService = app.get(BudgetsService);

    await removeFixtures();

    const owner = await registerFixtureUser({
      email: fixtureEmails[0],
      username: 'phase6_wallet_owner',
      displayName: 'Phase Six Wallet Owner',
    });

    ownerUserId = owner.userId;
    ownerAccessCookie = owner.accessCookie;

    const outsider = await registerFixtureUser({
      email: fixtureEmails[1],
      username: 'phase6_wallet_outsider',
      displayName: 'Phase Six Wallet Outsider',
    });

    outsiderAccessCookie = outsider.accessCookie;

    const player = await prisma.player.create({
      data: {
        fullName: 'Phase Six Striker',
        shortName: 'P6 Striker',
        nationalityCode: 'BD',
        primaryPosition: PlayerPosition.ST,
        secondaryPositions: [PlayerPosition.CF],
        preferredFoot: PreferredFoot.RIGHT,
        overall: 86,
        pace: 88,
        shooting: 89,
        passing: 76,
        dribbling: 84,
        defending: 35,
        physical: 82,
        goalkeeping: 7,
        marketValue: 35_000_000,
        sourceProvider,
        sourcePlayerId: 'phase6-player-01',
        dataVersion: 'e2e',
      },
    });

    const match = await prisma.match.create({
      data: {
        roomCode: roomCodes[0],
        createdById: ownerUserId,
        dataVersion: 'e2e',
        rulesVersion: 'e2e',
      },
    });

    matchId = match.id;

    const participant = await prisma.matchParticipant.create({
      data: {
        matchId,
        userId: ownerUserId,
        side: ParticipantSide.PLAYER_ONE,
      },
    });

    participantId = participant.id;

    const auction = await prisma.auction.create({
      data: {
        matchId,
        playerId: player.id,
        type: AuctionType.PLAYER,
        openingPrice: 10_000_000,
        currentPrice: 10_000_000,
        minimumIncrement: 1_000_000,
      },
    });

    auctionId = auction.id;

    const otherMatch = await prisma.match.create({
      data: {
        roomCode: roomCodes[1],
        createdById: ownerUserId,
        dataVersion: 'e2e',
        rulesVersion: 'e2e',
      },
    });

    const otherAuction = await prisma.auction.create({
      data: {
        matchId: otherMatch.id,
        playerId: player.id,
        type: AuctionType.PLAYER,
        openingPrice: 10_000_000,
        currentPrice: 10_000_000,
        minimumIncrement: 1_000_000,
      },
    });

    otherAuctionId = otherAuction.id;
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });

  it('starts every participant with an authenticated €150M wallet', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .query({ matchId })
      .expect(401);

    const response = await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .set('Cookie', ownerAccessCookie)
      .query({ matchId })
      .expect(200);

    expect(response.body).toMatchObject({
      participantId,
      matchId,
      roomCode: roomCodes[0],
      startingBudget: 150_000_000,
      availableBudget: 150_000_000,
      reservedBudget: 0,
      spentBudget: 0,
      remainingBudget: 150_000_000,
      committedBudget: 0,
      budgetPerParticipant: 150_000_000,
    });

    expect(
      response.body.availableBudget +
        response.body.reservedBudget +
        response.body.spentBudget,
    ).toBe(150_000_000);

    await request(app.getHttpServer())
      .get('/api/v1/wallet')
      .set('Cookie', outsiderAccessCookie)
      .query({ matchId })
      .expect(404);
  });

  it('does not expose client-controlled wallet mutation routes', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/wallet/reserve')
      .set('Cookie', ownerAccessCookie)
      .send({
        participantId,
        auctionId,
        amount: 1,
      })
      .expect(404);

    await request(app.getHttpServer())
      .patch('/api/v1/wallet')
      .set('Cookie', ownerAccessCookie)
      .send({
        availableBudget: 150_000_000,
        reservedBudget: 0,
        spentBudget: 0,
      })
      .expect(404);
  });

  it('reserves funds atomically and replays identical operations safely', async () => {
    const input = {
      participantId,
      auctionId,
      amount: 42_000_000,
      idempotencyKey: 'phase6-reserve-main',
      description: 'Reserve winning bid.',
    };

    const reservation = await budgetsService.reserveFunds(input);

    expect(reservation).toMatchObject({
      replayed: false,
      wallet: {
        participantId,
        matchId,
        startingBudget: 150_000_000,
        availableBudget: 108_000_000,
        reservedBudget: 42_000_000,
        spentBudget: 0,
        remainingBudget: 108_000_000,
        committedBudget: 42_000_000,
      },
      transaction: {
        participantId,
        auctionId,
        type: BudgetTransactionType.RESERVATION,
        amount: 42_000_000,
        availableAfter: 108_000_000,
        reservedAfter: 42_000_000,
        spentAfter: 0,
      },
    });

    expect(reservation.transaction).not.toHaveProperty('idempotencyKey');
    expect(reservation.transaction).not.toHaveProperty('purchaseKey');

    const replay = await budgetsService.reserveFunds(input);

    expect(replay.replayed).toBe(true);
    expect(replay.transaction.id).toBe(reservation.transaction.id);
    expect(replay.wallet).toMatchObject({
      availableBudget: 108_000_000,
      reservedBudget: 42_000_000,
      spentBudget: 0,
    });

    await expect(
      budgetsService.reserveFunds({
        ...input,
        amount: 41_000_000,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const reservationCount = await prisma.budgetTransaction.count({
      where: {
        participantId,
        idempotencyKey: input.idempotencyKey,
      },
    });

    expect(reservationCount).toBe(1);
  });

  it('releases reservations and converts reserved funds into one purchase', async () => {
    const release = await budgetsService.releaseFunds({
      participantId,
      auctionId,
      amount: 7_000_000,
      idempotencyKey: 'phase6-release-main',
      description: 'Release excess reservation.',
    });

    expect(release).toMatchObject({
      replayed: false,
      wallet: {
        availableBudget: 115_000_000,
        reservedBudget: 35_000_000,
        spentBudget: 0,
      },
      transaction: {
        type: BudgetTransactionType.RELEASE,
        amount: 7_000_000,
      },
    });

    const purchase = await budgetsService.purchaseReservedFunds({
      participantId,
      auctionId,
      amount: 35_000_000,
      itemType: AuctionType.PLAYER,
      itemId: 'phase6-player-01',
      idempotencyKey: 'phase6-purchase-main',
      description: 'Player auction settlement.',
    });

    purchaseTransactionId = purchase.transaction.id;

    expect(purchase).toMatchObject({
      replayed: false,
      wallet: {
        availableBudget: 115_000_000,
        reservedBudget: 0,
        spentBudget: 35_000_000,
        remainingBudget: 115_000_000,
        committedBudget: 35_000_000,
      },
      transaction: {
        type: BudgetTransactionType.PURCHASE,
        itemType: AuctionType.PLAYER,
        itemId: 'phase6-player-01',
        amount: 35_000_000,
        availableAfter: 115_000_000,
        reservedAfter: 0,
        spentAfter: 35_000_000,
      },
    });
  });

  it('rejects duplicate purchases without corrupting the wallet', async () => {
    await budgetsService.reserveFunds({
      participantId,
      auctionId,
      amount: 1_000_000,
      idempotencyKey: 'phase6-reserve-duplicate-check',
    });

    const walletBefore = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: participantId,
      },
      select: {
        availableBudget: true,
        reservedBudget: true,
        spentBudget: true,
      },
    });

    await expect(
      budgetsService.purchaseReservedFunds({
        participantId,
        auctionId,
        amount: 1_000_000,
        itemType: AuctionType.PLAYER,
        itemId: 'phase6-player-01',
        idempotencyKey: 'phase6-duplicate-purchase',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const walletAfter = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: participantId,
      },
      select: {
        availableBudget: true,
        reservedBudget: true,
        spentBudget: true,
      },
    });

    expect(walletAfter).toEqual(walletBefore);

    await budgetsService.releaseFunds({
      participantId,
      auctionId,
      amount: 1_000_000,
      idempotencyKey: 'phase6-release-duplicate-check',
    });
  });

  it('rejects overspending, invalid amounts, and cross-match auctions', async () => {
    const walletBefore = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: participantId,
      },
      select: {
        availableBudget: true,
        reservedBudget: true,
        spentBudget: true,
      },
    });

    await expect(
      budgetsService.reserveFunds({
        participantId,
        auctionId,
        amount: 116_000_000,
        idempotencyKey: 'phase6-overspend',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      budgetsService.reserveFunds({
        participantId,
        auctionId,
        amount: 0,
        idempotencyKey: 'phase6-invalid-zero',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      budgetsService.purchaseReservedFunds({
        participantId,
        auctionId,
        amount: 1_000_000,
        itemType: AuctionType.MANAGER,
        itemId: 'phase6-manager-01',
        idempotencyKey: 'phase6-insufficient-reserved',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      budgetsService.reserveFunds({
        participantId,
        auctionId: otherAuctionId,
        amount: 1_000_000,
        idempotencyKey: 'phase6-cross-match',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const walletAfter = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: participantId,
      },
      select: {
        availableBudget: true,
        reservedBudget: true,
        spentBudget: true,
      },
    });

    expect(walletAfter).toEqual(walletBefore);
  });

  it('prevents concurrent reservations from overspending the wallet', async () => {
    const results = await Promise.allSettled([
      budgetsService.reserveFunds({
        participantId,
        auctionId,
        amount: 80_000_000,
        idempotencyKey: 'phase6-concurrent-reserve-a',
      }),
      budgetsService.reserveFunds({
        participantId,
        auctionId,
        amount: 80_000_000,
        idempotencyKey: 'phase6-concurrent-reserve-b',
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    if (rejected[0]?.status === 'rejected') {
      expect(rejected[0].reason).toBeInstanceOf(BadRequestException);
    }

    const wallet = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: participantId,
      },
      select: {
        availableBudget: true,
        reservedBudget: true,
        spentBudget: true,
      },
    });

    expect(wallet).toEqual({
      availableBudget: 35_000_000,
      reservedBudget: 80_000_000,
      spentBudget: 35_000_000,
    });

    await budgetsService.releaseFunds({
      participantId,
      auctionId,
      amount: 80_000_000,
      idempotencyKey: 'phase6-release-concurrent-reservation',
    });
  });

  it('returns private, paginated spending history only to its owner', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/wallet/transactions')
      .set('Cookie', ownerAccessCookie)
      .query({
        matchId,
        page: 1,
        pageSize: 100,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      matchId,
      participantId,
      pagination: {
        page: 1,
        pageSize: 100,
        total: 7,
        totalPages: 1,
      },
    });

    expect(response.body.data).toHaveLength(7);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: BudgetTransactionType.RESERVATION,
          amount: 42_000_000,
        }),
        expect.objectContaining({
          type: BudgetTransactionType.RELEASE,
          amount: 7_000_000,
        }),
        expect.objectContaining({
          type: BudgetTransactionType.PURCHASE,
          itemType: AuctionType.PLAYER,
          itemId: 'phase6-player-01',
          amount: 35_000_000,
        }),
      ]),
    );

    for (const transaction of response.body.data as Array<
      Record<string, unknown>
    >) {
      expect(transaction).not.toHaveProperty('idempotencyKey');
      expect(transaction).not.toHaveProperty('purchaseKey');
    }

    const purchases = await request(app.getHttpServer())
      .get('/api/v1/wallet/transactions')
      .set('Cookie', ownerAccessCookie)
      .query({
        matchId,
        type: BudgetTransactionType.PURCHASE,
        page: 1,
        pageSize: 20,
      })
      .expect(200);

    expect(purchases.body.pagination.total).toBe(1);
    expect(purchases.body.data).toHaveLength(1);
    expect(purchases.body.data[0]).toMatchObject({
      type: BudgetTransactionType.PURCHASE,
      amount: 35_000_000,
    });

    await request(app.getHttpServer())
      .get('/api/v1/wallet/transactions')
      .set('Cookie', outsiderAccessCookie)
      .query({ matchId })
      .expect(404);
  });

  it('keeps the transaction ledger immutable and validates snapshots', async () => {
    await expect(
      prisma.budgetTransaction.update({
        where: {
          id: purchaseTransactionId,
        },
        data: {
          description: 'Tampered transaction.',
        },
      }),
    ).rejects.toThrow();

    const purchase = await prisma.budgetTransaction.findUniqueOrThrow({
      where: {
        id: purchaseTransactionId,
      },
    });

    expect(purchase.description).toBe('Player auction settlement.');

    await expect(
      prisma.budgetTransaction.create({
        data: {
          participantId,
          auctionId,
          type: BudgetTransactionType.RELEASE,
          amount: 1,
          availableAfter: 150_000_000,
          reservedAfter: 0,
          spentAfter: 35_000_000,
          idempotencyKey: 'phase6-invalid-ledger-snapshot',
          description: 'This invalid snapshot must be rejected.',
        },
      }),
    ).rejects.toThrow();

    const finalWallet = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: participantId,
      },
      select: {
        startingBudget: true,
        availableBudget: true,
        reservedBudget: true,
        spentBudget: true,
      },
    });

    expect(finalWallet).toEqual({
      startingBudget: 150_000_000,
      availableBudget: 115_000_000,
      reservedBudget: 0,
      spentBudget: 35_000_000,
    });
  });
});
