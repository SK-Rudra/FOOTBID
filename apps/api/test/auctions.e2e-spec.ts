import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/application.js';
import { AuctionsService } from '../src/auctions/auctions.service.js';
import {
  AuctionEventType,
  AuctionStatus,
  BudgetTransactionType,
  ParticipantSide,
  PlayerPosition,
  PreferredFoot,
} from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

type SetCookieHeaders = string[] | string | undefined;

interface AuctionFixture {
  matchId: string;
  playerId: string;
  hostParticipantId: string;
  guestParticipantId: string;
}

interface AuctionMutationBody {
  auction: {
    id: string;
    matchId: string;
    playerId: string;
    status: AuctionStatus;
    currentPrice: number;
    version: number;
    endsAt: string | null;
    bidCount: number;
    highestBid: {
      participantId: string;
      amount: number;
    } | null;
    winner: {
      id: string;
      userId: string;
    } | null;
  };
  eventType: AuctionEventType;
  replayed: boolean;
}

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

describe('FOOTBID real-time auction engine (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auctionsService: AuctionsService;

  let hostUserId: string;
  let guestUserId: string;

  let hostAccessCookie: string;
  let guestAccessCookie: string;
  let outsiderAccessCookie: string;

  let fixtureSequence = 0;

  const sourceProvider = 'footbid-phase7-e2e';
  const dataVersion = 'phase7-e2e';

  const fixtureEmails = [
    'phase7-host@phase7.test',
    'phase7-guest@phase7.test',
    'phase7-outsider@phase7.test',
  ];

  async function removeFixtures(): Promise<void> {
    await prisma.match.deleteMany({
      where: {
        dataVersion,
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
        password: 'FootbidPhase7Password1',
      })
      .expect(201);

    const cookies = response.headers['set-cookie'] as SetCookieHeaders;

    return {
      userId: response.body.user.id as string,
      accessCookie: cookiePair(findSetCookie(cookies, 'footbid_access')),
    };
  }

  async function createAuctionFixture(): Promise<AuctionFixture> {
    fixtureSequence += 1;

    const fixtureNumber = String(fixtureSequence).padStart(8, '0');

    const player = await prisma.player.create({
      data: {
        fullName: `Phase Seven Player ${fixtureSequence}`,
        shortName: `P7 Player ${fixtureSequence}`,
        nationalityCode: 'BD',
        primaryPosition: PlayerPosition.ST,
        secondaryPositions: [PlayerPosition.CF],
        preferredFoot: PreferredFoot.RIGHT,
        overall: 82,
        pace: 84,
        shooting: 85,
        passing: 76,
        dribbling: 81,
        defending: 35,
        physical: 80,
        goalkeeping: 7,
        marketValue: 20_000_000,
        sourceProvider,
        sourcePlayerId: `phase7-player-${fixtureNumber}`,
        dataVersion,
      },
    });

    const match = await prisma.match.create({
      data: {
        roomCode: `P7${fixtureNumber}`,
        createdById: hostUserId,
        dataVersion,
        rulesVersion: dataVersion,
      },
    });

    const hostParticipant = await prisma.matchParticipant.create({
      data: {
        matchId: match.id,
        userId: hostUserId,
        side: ParticipantSide.PLAYER_ONE,
      },
    });

    const guestParticipant = await prisma.matchParticipant.create({
      data: {
        matchId: match.id,
        userId: guestUserId,
        side: ParticipantSide.PLAYER_TWO,
      },
    });

    return {
      matchId: match.id,
      playerId: player.id,
      hostParticipantId: hostParticipant.id,
      guestParticipantId: guestParticipant.id,
    };
  }

  async function nominatePlayer(
    fixture: AuctionFixture,
  ): Promise<AuctionMutationBody> {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/matches/${fixture.matchId}/auctions`)
      .set('Cookie', hostAccessCookie)
      .send({
        playerId: fixture.playerId,
        openingPrice: 10_000_000,
        minimumIncrement: 1_000_000,
      })
      .expect(201);

    return response.body as AuctionMutationBody;
  }

  async function startAuction(auctionId: string): Promise<AuctionMutationBody> {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/start`)
      .set('Cookie', hostAccessCookie)
      .send({
        durationSeconds: 15,
      })
      .expect(200);

    return response.body as AuctionMutationBody;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    prisma = app.get(PrismaService);
    auctionsService = app.get(AuctionsService);

    await removeFixtures();

    const host = await registerFixtureUser({
      email: fixtureEmails[0],
      username: 'phase7_host',
      displayName: 'Phase Seven Host',
    });

    hostUserId = host.userId;
    hostAccessCookie = host.accessCookie;

    const guest = await registerFixtureUser({
      email: fixtureEmails[1],
      username: 'phase7_guest',
      displayName: 'Phase Seven Guest',
    });

    guestUserId = guest.userId;
    guestAccessCookie = guest.accessCookie;

    const outsider = await registerFixtureUser({
      email: fixtureEmails[2],
      username: 'phase7_outsider',
      displayName: 'Phase Seven Outsider',
    });

    outsiderAccessCookie = outsider.accessCookie;
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });

  it('protects auction routes and restricts nomination to the host', async () => {
    const fixture = await createAuctionFixture();

    await request(app.getHttpServer())
      .post(`/api/v1/matches/${fixture.matchId}/auctions`)
      .send({
        playerId: fixture.playerId,
        openingPrice: 10_000_000,
        minimumIncrement: 1_000_000,
      })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/v1/matches/${fixture.matchId}/auctions`)
      .set('Cookie', guestAccessCookie)
      .send({
        playerId: fixture.playerId,
        openingPrice: 10_000_000,
        minimumIncrement: 1_000_000,
      })
      .expect(403);

    const nomination = await nominatePlayer(fixture);

    expect(nomination).toMatchObject({
      eventType: AuctionEventType.NOMINATED,
      replayed: false,
      auction: {
        matchId: fixture.matchId,
        playerId: fixture.playerId,
        status: AuctionStatus.WAITING,
        currentPrice: 10_000_000,
        version: 0,
        bidCount: 0,
        highestBid: null,
      },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/auctions/${nomination.auction.id}`)
      .set('Cookie', outsiderAccessCookie)
      .expect(403);

    const listResponse = await request(app.getHttpServer())
      .get(`/api/v1/matches/${fixture.matchId}/auctions`)
      .set('Cookie', guestAccessCookie)
      .expect(200);

    expect(listResponse.body.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });

    expect(listResponse.body.data[0]).toMatchObject({
      id: nomination.auction.id,
      status: AuctionStatus.WAITING,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/matches/${fixture.matchId}/auctions`)
      .set('Cookie', hostAccessCookie)
      .send({
        playerId: fixture.playerId,
        openingPrice: 10_000_000,
        minimumIncrement: 1_000_000,
      })
      .expect(409);
  });

  it('validates auction input and protects host-only lifecycle actions', async () => {
    const fixture = await createAuctionFixture();

    await request(app.getHttpServer())
      .post(`/api/v1/matches/${fixture.matchId}/auctions`)
      .set('Cookie', hostAccessCookie)
      .send({
        playerId: fixture.playerId,
        openingPrice: 1,
        minimumIncrement: 1,
        unexpectedField: true,
      })
      .expect(400);

    const nomination = await nominatePlayer(fixture);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/start`)
      .set('Cookie', guestAccessCookie)
      .send({
        durationSeconds: 15,
      })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/start`)
      .set('Cookie', hostAccessCookie)
      .send({
        durationSeconds: 5,
      })
      .expect(400);

    const started = await startAuction(nomination.auction.id);

    expect(started).toMatchObject({
      eventType: AuctionEventType.STARTED,
      replayed: false,
      auction: {
        status: AuctionStatus.ACTIVE,
        version: 1,
      },
    });

    expect(started.auction.endsAt).toEqual(expect.any(String));

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/cancel`)
      .set('Cookie', guestAccessCookie)
      .expect(403);

    const cancelledResponse = await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/cancel`)
      .set('Cookie', hostAccessCookie)
      .expect(200);

    expect(cancelledResponse.body).toMatchObject({
      eventType: AuctionEventType.CANCELLED,
      replayed: false,
      auction: {
        status: AuctionStatus.CANCELLED,
        version: 2,
      },
    });
  });

  it('accepts an idempotent bid only once and reserves its budget', async () => {
    const fixture = await createAuctionFixture();
    const nomination = await nominatePlayer(fixture);

    await startAuction(nomination.auction.id);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', outsiderAccessCookie)
      .send({
        amount: 10_000_000,
        idempotencyKey: 'phase7-outsider-bid',
      })
      .expect(403);

    const bidInput = {
      amount: 10_000_000,
      idempotencyKey: 'phase7-idempotent-bid',
    };

    const firstResponse = await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', guestAccessCookie)
      .send(bidInput)
      .expect(200);

    expect(firstResponse.body).toMatchObject({
      eventType: AuctionEventType.BID_PLACED,
      replayed: false,
      auction: {
        currentPrice: 10_000_000,
        version: 2,
        bidCount: 1,
        highestBid: {
          participantId: fixture.guestParticipantId,
          amount: 10_000_000,
        },
      },
    });

    const replayResponse = await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', guestAccessCookie)
      .send(bidInput)
      .expect(200);

    expect(replayResponse.body.replayed).toBe(true);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', guestAccessCookie)
      .send({
        amount: 11_000_000,
        idempotencyKey: bidInput.idempotencyKey,
      })
      .expect(409);

    expect(
      await prisma.bid.count({
        where: {
          auctionId: nomination.auction.id,
        },
      }),
    ).toBe(1);

    expect(
      await prisma.budgetTransaction.count({
        where: {
          auctionId: nomination.auction.id,
          participantId: fixture.guestParticipantId,
          type: BudgetTransactionType.RESERVATION,
        },
      }),
    ).toBe(1);

    const wallet = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: fixture.guestParticipantId,
      },
    });

    expect(wallet).toMatchObject({
      availableBudget: 140_000_000,
      reservedBudget: 10_000_000,
      spentBudget: 0,
    });
  });

  it('reserves only the additional amount when the leader raises their bid', async () => {
    const fixture = await createAuctionFixture();
    const nomination = await nominatePlayer(fixture);

    await startAuction(nomination.auction.id);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', guestAccessCookie)
      .send({
        amount: 10_000_000,
        idempotencyKey: 'phase7-self-bid-one',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', guestAccessCookie)
      .send({
        amount: 12_000_000,
        idempotencyKey: 'phase7-self-bid-two',
      })
      .expect(200);

    const wallet = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: fixture.guestParticipantId,
      },
    });

    expect(wallet).toMatchObject({
      availableBudget: 138_000_000,
      reservedBudget: 12_000_000,
      spentBudget: 0,
    });

    const reservations = await prisma.budgetTransaction.findMany({
      where: {
        participantId: fixture.guestParticipantId,
        auctionId: nomination.auction.id,
        type: BudgetTransactionType.RESERVATION,
      },
      select: {
        amount: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    expect(reservations.map((entry) => entry.amount)).toEqual([
      10_000_000, 2_000_000,
    ]);
  });

  it('releases the former leader and reserves the new highest bid atomically', async () => {
    const fixture = await createAuctionFixture();
    const nomination = await nominatePlayer(fixture);

    await startAuction(nomination.auction.id);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', hostAccessCookie)
      .send({
        amount: 10_000_000,
        idempotencyKey: 'phase7-host-opening-bid',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', guestAccessCookie)
      .send({
        amount: 11_000_000,
        idempotencyKey: 'phase7-guest-outbid',
      })
      .expect(200);

    const [hostWallet, guestWallet] = await Promise.all([
      prisma.matchParticipant.findUniqueOrThrow({
        where: {
          id: fixture.hostParticipantId,
        },
      }),
      prisma.matchParticipant.findUniqueOrThrow({
        where: {
          id: fixture.guestParticipantId,
        },
      }),
    ]);

    expect(hostWallet).toMatchObject({
      availableBudget: 150_000_000,
      reservedBudget: 0,
      spentBudget: 0,
    });

    expect(guestWallet).toMatchObject({
      availableBudget: 139_000_000,
      reservedBudget: 11_000_000,
      spentBudget: 0,
    });

    expect(
      hostWallet.availableBudget +
        hostWallet.reservedBudget +
        hostWallet.spentBudget,
    ).toBe(150_000_000);

    expect(
      guestWallet.availableBudget +
        guestWallet.reservedBudget +
        guestWallet.spentBudget,
    ).toBe(150_000_000);
  });

  it('accepts only one winner when simultaneous bids race', async () => {
    const fixture = await createAuctionFixture();
    const nomination = await nominatePlayer(fixture);

    await startAuction(nomination.auction.id);

    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
        .set('Cookie', hostAccessCookie)
        .send({
          amount: 10_000_000,
          idempotencyKey: 'phase7-race-host',
        }),
      request(app.getHttpServer())
        .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
        .set('Cookie', guestAccessCookie)
        .send({
          amount: 10_000_000,
          idempotencyKey: 'phase7-race-guest',
        }),
    ]);

    const successfulResponses = responses.filter(
      (response) => response.status === 200,
    );

    const rejectedResponses = responses.filter(
      (response) => response.status !== 200,
    );

    expect(successfulResponses).toHaveLength(1);
    expect(rejectedResponses).toHaveLength(1);
    expect([400, 409]).toContain(rejectedResponses[0]?.status);

    expect(
      await prisma.bid.count({
        where: {
          auctionId: nomination.auction.id,
        },
      }),
    ).toBe(1);

    const participants = await prisma.matchParticipant.findMany({
      where: {
        matchId: fixture.matchId,
      },
    });

    expect(
      participants.reduce(
        (total, participant) => total + participant.reservedBudget,
        0,
      ),
    ).toBe(10_000_000);

    for (const participant of participants) {
      expect(
        participant.availableBudget +
          participant.reservedBudget +
          participant.spentBudget,
      ).toBe(150_000_000);
    }
  });

  it('enters last call, settles the winner, deducts funds, and records ownership', async () => {
    const fixture = await createAuctionFixture();
    const nomination = await nominatePlayer(fixture);
    const started = await startAuction(nomination.auction.id);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', guestAccessCookie)
      .send({
        amount: 10_000_000,
        idempotencyKey: 'phase7-winning-bid',
      })
      .expect(200);

    if (!started.auction.endsAt) {
      throw new Error('Started auction did not contain an end time.');
    }

    const endsAt = new Date(started.auction.endsAt);

    const lastCallResults = await auctionsService.processDueAuctions(
      new Date(endsAt.getTime() - 5_000),
    );

    const lastCallResult = lastCallResults.find(
      (result) => result.auction.id === nomination.auction.id,
    );
    expect(lastCallResult).toBeDefined();
    expect(lastCallResult).toMatchObject({
      eventType: AuctionEventType.LAST_CALL,
      auction: {
        status: AuctionStatus.LAST_CALL,
      },
    });

    const settlementResults = await auctionsService.processDueAuctions(
      new Date(endsAt.getTime() + 1_000),
    );

    const settlementResult = settlementResults.find(
      (result) => result.auction.id === nomination.auction.id,
    );
    expect(settlementResult).toBeDefined();
    expect(settlementResult).toMatchObject({
      eventType: AuctionEventType.SOLD,
      auction: {
        status: AuctionStatus.SOLD,
        winner: {
          id: fixture.guestParticipantId,
          userId: guestUserId,
        },
      },
    });

    const ownership = await prisma.playerOwnership.findUniqueOrThrow({
      where: {
        auctionId: nomination.auction.id,
      },
    });

    expect(ownership).toMatchObject({
      matchId: fixture.matchId,
      participantId: fixture.guestParticipantId,
      playerId: fixture.playerId,
      acquisitionPrice: 10_000_000,
    });

    const wallet = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: fixture.guestParticipantId,
      },
    });

    expect(wallet).toMatchObject({
      availableBudget: 140_000_000,
      reservedBudget: 0,
      spentBudget: 10_000_000,
    });

    const historyResponse = await request(app.getHttpServer())
      .get(`/api/v1/auctions/${nomination.auction.id}/history`)
      .set('Cookie', guestAccessCookie)
      .expect(200);

    const historyTypes = (
      historyResponse.body.data as Array<{
        type: AuctionEventType;
      }>
    ).map((event) => event.type);

    expect(historyTypes).toEqual(
      expect.arrayContaining([
        AuctionEventType.NOMINATED,
        AuctionEventType.STARTED,
        AuctionEventType.BID_PLACED,
        AuctionEventType.LAST_CALL,
        AuctionEventType.SOLD,
      ]),
    );
  });

  it('marks an auction without bids as unsold', async () => {
    const fixture = await createAuctionFixture();
    const nomination = await nominatePlayer(fixture);
    const started = await startAuction(nomination.auction.id);

    if (!started.auction.endsAt) {
      throw new Error('Started auction did not contain an end time.');
    }

    const results = await auctionsService.processDueAuctions(
      new Date(new Date(started.auction.endsAt).getTime() + 1_000),
    );

    const unsoldResult = results.find(
      (result) => result.auction.id === nomination.auction.id,
    );
    expect(unsoldResult).toBeDefined();
    expect(unsoldResult).toMatchObject({
      eventType: AuctionEventType.UNSOLD,
      auction: {
        status: AuctionStatus.UNSOLD,
        highestBid: null,
        winner: null,
      },
    });

    expect(
      await prisma.playerOwnership.count({
        where: {
          auctionId: nomination.auction.id,
        },
      }),
    ).toBe(0);
  });

  it('returns the reserved budget when the host cancels a live auction', async () => {
    const fixture = await createAuctionFixture();
    const nomination = await nominatePlayer(fixture);

    await startAuction(nomination.auction.id);

    await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/bids`)
      .set('Cookie', guestAccessCookie)
      .send({
        amount: 10_000_000,
        idempotencyKey: 'phase7-cancelled-bid',
      })
      .expect(200);

    const cancellationResponse = await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/cancel`)
      .set('Cookie', hostAccessCookie)
      .expect(200);

    expect(cancellationResponse.body).toMatchObject({
      eventType: AuctionEventType.CANCELLED,
      replayed: false,
      auction: {
        status: AuctionStatus.CANCELLED,
      },
    });

    const replayResponse = await request(app.getHttpServer())
      .post(`/api/v1/auctions/${nomination.auction.id}/cancel`)
      .set('Cookie', hostAccessCookie)
      .expect(200);

    expect(replayResponse.body.replayed).toBe(true);

    const wallet = await prisma.matchParticipant.findUniqueOrThrow({
      where: {
        id: fixture.guestParticipantId,
      },
    });

    expect(wallet).toMatchObject({
      availableBudget: 150_000_000,
      reservedBudget: 0,
      spentBudget: 0,
    });

    expect(
      await prisma.auctionEvent.count({
        where: {
          auctionId: nomination.auction.id,
          type: AuctionEventType.CANCELLED,
        },
      }),
    ).toBe(1);
  });
});
