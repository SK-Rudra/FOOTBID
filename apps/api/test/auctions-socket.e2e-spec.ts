import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { io, type Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/application.js';
import { AuctionsScheduler } from '../src/auctions/auctions.scheduler.js';
import {
  AuctionEventType,
  AuctionStatus,
  ParticipantSide,
  PlayerPosition,
  PreferredFoot,
} from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { SocketIoAdapter } from '../src/realtime/socket-io.adapter.js';

type SetCookieHeaders = string[] | string | undefined;

interface SocketErrorPayload {
  statusCode?: number;
  message?:
    | string
    | {
        statusCode?: number;
        message?: string;
      };
  retryAfterMs?: number;
}

interface AuctionMutationPayload {
  auction: {
    id: string;
    matchId: string;
    status: AuctionStatus;
    endsAt: string | null;
    currentPrice: number;
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

interface SocketAuctionFixture {
  matchId: string;
  auctionId: string;
  guestParticipantId: string;
  endsAt: string;
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

function socketErrorStatus(payload: SocketErrorPayload): number | undefined {
  if (typeof payload.statusCode === 'number') {
    return payload.statusCode;
  }

  if (
    typeof payload.message === 'object' &&
    payload.message !== null &&
    typeof payload.message.statusCode === 'number'
  ) {
    return payload.message.statusCode;
  }

  return undefined;
}

function waitForSocketEvent<T>(
  socket: ClientSocket,
  eventName: string,
  predicate: (payload: T) => boolean = () => true,
  timeoutMs = 5_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.off(eventName, listener);
      reject(new Error(`Timed out waiting for socket event "${eventName}".`));
    }, timeoutMs);

    const listener = (payload: T) => {
      if (!predicate(payload)) {
        return;
      }

      clearTimeout(timeout);
      socket.off(eventName, listener);
      resolve(payload);
    };

    socket.on(eventName, listener);
  });
}

function emitWithAcknowledgement<T>(
  socket: ClientSocket,
  eventName: string,
  payload: unknown,
  timeoutMs = 5_000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      socket.off('exception', exceptionListener);
      socket.off('disconnect', disconnectListener);
    };

    const exceptionListener = (error: SocketErrorPayload) => {
      cleanup();
      reject(
        new Error(
          `Socket event "${eventName}" failed: ${JSON.stringify(error)}`,
        ),
      );
    };

    const disconnectListener = (reason: string) => {
      cleanup();
      reject(
        new Error(
          `Socket disconnected while waiting for "${eventName}": ${reason}`,
        ),
      );
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error(`Timed out waiting for acknowledgement from "${eventName}".`),
      );
    }, timeoutMs);

    socket.once('exception', exceptionListener);
    socket.once('disconnect', disconnectListener);

    socket.emit(eventName, payload, (response: T) => {
      cleanup();
      resolve(response);
    });
  });
}

describe('FOOTBID auction Socket.IO gateway (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let auctionsScheduler: AuctionsScheduler;

  let serverUrl: string;

  let hostUserId: string;
  let guestUserId: string;

  let hostAccessCookie: string;
  let guestAccessCookie: string;

  let fixtureSequence = 0;

  const openSockets = new Set<ClientSocket>();

  const dataVersion = 'phase7-socket-e2e';
  const sourceProvider = 'footbid-phase7-socket-e2e';

  const fixtureEmails = [
    'phase7-socket-host@phase7.test',
    'phase7-socket-guest@phase7.test',
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
        password: 'FootbidPhase7SocketPassword1',
      })
      .expect(201);

    const cookies = response.headers['set-cookie'] as SetCookieHeaders;

    return {
      userId: response.body.user.id as string,
      accessCookie: cookiePair(findSetCookie(cookies, 'footbid_access')),
    };
  }

  function createClient(accessCookie?: string): ClientSocket {
    const cookieHeaders = accessCookie
      ? {
          cookie: accessCookie,
        }
      : undefined;

    const socket = io(`${serverUrl}/auctions`, {
      autoConnect: false,
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
      withCredentials: true,
      ...(cookieHeaders
        ? {
            extraHeaders: cookieHeaders,
            transportOptions: {
              websocket: {
                extraHeaders: cookieHeaders,
              },
            },
          }
        : {}),
    });

    openSockets.add(socket);

    return socket;
  }

  async function connectAuthenticatedClient(
    accessCookie: string,
  ): Promise<ClientSocket> {
    const socket = createClient(accessCookie);

    const readyPromise = waitForSocketEvent<{
      userId: string;
      serverTime: string;
    }>(socket, 'auction:ready');

    const connectionErrorPromise = new Promise<never>((_, reject) => {
      socket.once('connect_error', (error) => {
        reject(error);
      });
    });

    const authenticationErrorPromise = new Promise<never>((_, reject) => {
      socket.once('auction:error', (payload: SocketErrorPayload) => {
        reject(
          new Error(`Socket authentication failed: ${JSON.stringify(payload)}`),
        );
      });
    });

    socket.connect();

    await Promise.race([
      readyPromise,
      connectionErrorPromise,
      authenticationErrorPromise,
    ]);

    return socket;
  }

  async function createStartedAuction(): Promise<SocketAuctionFixture> {
    fixtureSequence += 1;

    const fixtureNumber = String(fixtureSequence).padStart(7, '0');

    const player = await prisma.player.create({
      data: {
        fullName: `Socket Auction Player ${fixtureSequence}`,
        shortName: `Socket Player ${fixtureSequence}`,
        nationalityCode: 'BD',
        primaryPosition: PlayerPosition.ST,
        secondaryPositions: [PlayerPosition.CF],
        preferredFoot: PreferredFoot.RIGHT,
        overall: 83,
        pace: 86,
        shooting: 85,
        passing: 75,
        dribbling: 82,
        defending: 34,
        physical: 81,
        goalkeeping: 7,
        marketValue: 21_000_000,
        sourceProvider,
        sourcePlayerId: `phase7-socket-player-${fixtureNumber}`,
        dataVersion,
      },
    });

    const match = await prisma.match.create({
      data: {
        roomCode: `P7S${fixtureNumber}`,
        createdById: hostUserId,
        dataVersion,
        rulesVersion: dataVersion,
      },
    });

    await prisma.matchParticipant.create({
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

    const nominationResponse = await request(app.getHttpServer())
      .post(`/api/v1/matches/${match.id}/auctions`)
      .set('Cookie', hostAccessCookie)
      .send({
        playerId: player.id,
        openingPrice: 10_000_000,
        minimumIncrement: 1_000_000,
      })
      .expect(201);

    const auctionId = nominationResponse.body.auction.id as string;

    const startResponse = await request(app.getHttpServer())
      .post(`/api/v1/auctions/${auctionId}/start`)
      .set('Cookie', hostAccessCookie)
      .send({
        durationSeconds: 15,
      })
      .expect(200);

    const endsAt = startResponse.body.auction.endsAt as string | undefined;

    if (!endsAt) {
      throw new Error('Socket auction did not receive an end time.');
    }

    return {
      matchId: match.id,
      auctionId,
      guestParticipantId: guestParticipant.id,
      endsAt,
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    configureApplication(app);

    const config = app.get(ConfigService);
    const webUrl = config.getOrThrow<string>('WEB_URL');

    app.useWebSocketAdapter(new SocketIoAdapter(app, webUrl));

    await app.listen(0, '127.0.0.1');

    prisma = app.get(PrismaService);
    auctionsScheduler = app.get(AuctionsScheduler);

    const address = app.getHttpServer().address() as AddressInfo;

    serverUrl = `http://127.0.0.1:${address.port}`;

    await removeFixtures();

    const host = await registerFixtureUser({
      email: fixtureEmails[0],
      username: 'phase7_socket_host',
      displayName: 'Phase Seven Socket Host',
    });

    hostUserId = host.userId;
    hostAccessCookie = host.accessCookie;

    const guest = await registerFixtureUser({
      email: fixtureEmails[1],
      username: 'phase7_socket_guest',
      displayName: 'Phase Seven Socket Guest',
    });

    guestUserId = guest.userId;
    guestAccessCookie = guest.accessCookie;
  });

  afterEach(() => {
    for (const socket of openSockets) {
      socket.disconnect();
    }

    openSockets.clear();
  });

  afterAll(async () => {
    for (const socket of openSockets) {
      socket.disconnect();
    }

    openSockets.clear();

    await removeFixtures();
    await app.close();
  });

  it('disconnects a socket that does not present an access cookie', async () => {
    const socket = createClient();

    const errorPromise = waitForSocketEvent<SocketErrorPayload>(
      socket,
      'auction:error',
    );

    const disconnectPromise = new Promise<string>((resolve) => {
      socket.once('disconnect', resolve);
    });

    socket.connect();

    const error = await errorPromise;
    const disconnectReason = await disconnectPromise;

    expect(socketErrorStatus(error)).toBe(401);
    expect(error.message).toBe('Authentication required.');
    expect(disconnectReason).toBe('io server disconnect');
    expect(socket.connected).toBe(false);
  });

  it('authenticates members, broadcasts bids, and broadcasts automatic settlement', async () => {
    const fixture = await createStartedAuction();

    const [hostSocket, guestSocket] = await Promise.all([
      connectAuthenticatedClient(hostAccessCookie),
      connectAuthenticatedClient(guestAccessCookie),
    ]);

    const hostJoinResponse = await emitWithAcknowledgement<{
      joined: boolean;
      auction: {
        id: string;
        status: AuctionStatus;
      };
    }>(hostSocket, 'auction:join', {
      auctionId: fixture.auctionId,
    });

    const guestJoinResponse = await emitWithAcknowledgement<{
      joined: boolean;
      auction: {
        id: string;
        status: AuctionStatus;
      };
    }>(guestSocket, 'auction:join', {
      auctionId: fixture.auctionId,
    });

    expect(hostJoinResponse).toMatchObject({
      joined: true,
      auction: {
        id: fixture.auctionId,
        status: AuctionStatus.ACTIVE,
      },
    });

    expect(guestJoinResponse).toMatchObject({
      joined: true,
      auction: {
        id: fixture.auctionId,
        status: AuctionStatus.ACTIVE,
      },
    });

    const hostBidUpdatePromise = waitForSocketEvent<AuctionMutationPayload>(
      hostSocket,
      'auction:updated',
      (payload) =>
        payload.auction.id === fixture.auctionId &&
        payload.eventType === AuctionEventType.BID_PLACED,
    );

    const guestBidUpdatePromise = waitForSocketEvent<AuctionMutationPayload>(
      guestSocket,
      'auction:updated',
      (payload) =>
        payload.auction.id === fixture.auctionId &&
        payload.eventType === AuctionEventType.BID_PLACED,
    );

    const bidAcknowledgement =
      await emitWithAcknowledgement<AuctionMutationPayload>(
        guestSocket,
        'auction:bid',
        {
          auctionId: fixture.auctionId,
          amount: 10_000_000,
          idempotencyKey: 'phase7-socket-winning-bid',
        },
      );

    const [hostBidUpdate, guestBidUpdate] = await Promise.all([
      hostBidUpdatePromise,
      guestBidUpdatePromise,
    ]);

    expect(bidAcknowledgement).toMatchObject({
      eventType: AuctionEventType.BID_PLACED,
      replayed: false,
      auction: {
        id: fixture.auctionId,
        currentPrice: 10_000_000,
        highestBid: {
          participantId: fixture.guestParticipantId,
          amount: 10_000_000,
        },
      },
    });

    expect(hostBidUpdate).toMatchObject(bidAcknowledgement);
    expect(guestBidUpdate).toMatchObject(bidAcknowledgement);

    const endsAt = new Date(fixture.endsAt);

    const lastCallUpdatePromise = waitForSocketEvent<AuctionMutationPayload>(
      guestSocket,
      'auction:updated',
      (payload) =>
        payload.auction.id === fixture.auctionId &&
        payload.eventType === AuctionEventType.LAST_CALL,
    );

    await auctionsScheduler.runOnce(new Date(endsAt.getTime() - 5_000));

    const lastCallUpdate = await lastCallUpdatePromise;

    expect(lastCallUpdate).toMatchObject({
      eventType: AuctionEventType.LAST_CALL,
      auction: {
        id: fixture.auctionId,
        status: AuctionStatus.LAST_CALL,
      },
    });

    const soldUpdatePromise = waitForSocketEvent<AuctionMutationPayload>(
      guestSocket,
      'auction:updated',
      (payload) =>
        payload.auction.id === fixture.auctionId &&
        payload.eventType === AuctionEventType.SOLD,
    );

    await auctionsScheduler.runOnce(new Date(endsAt.getTime() + 1_000));

    const soldUpdate = await soldUpdatePromise;

    expect(soldUpdate).toMatchObject({
      eventType: AuctionEventType.SOLD,
      auction: {
        id: fixture.auctionId,
        status: AuctionStatus.SOLD,
        winner: {
          id: fixture.guestParticipantId,
          userId: guestUserId,
        },
      },
    });
  });

  it('rate limits excessive socket bid messages', async () => {
    const fixture = await createStartedAuction();

    const guestSocket = await connectAuthenticatedClient(guestAccessCookie);

    await emitWithAcknowledgement(guestSocket, 'auction:join', {
      auctionId: fixture.auctionId,
    });

    const repeatedBid = {
      auctionId: fixture.auctionId,
      amount: 10_000_000,
      idempotencyKey: 'phase7-socket-rate-limit-bid',
    };

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const acknowledgement =
        await emitWithAcknowledgement<AuctionMutationPayload>(
          guestSocket,
          'auction:bid',
          repeatedBid,
        );

      expect(acknowledgement.auction.id).toBe(fixture.auctionId);
    }

    const exceptionPromise = waitForSocketEvent<SocketErrorPayload>(
      guestSocket,
      'exception',
      (payload) => socketErrorStatus(payload) === 429,
    );

    guestSocket.emit('auction:bid', repeatedBid);

    const rateLimitError = await exceptionPromise;

    expect(socketErrorStatus(rateLimitError)).toBe(429);
    expect(rateLimitError.retryAfterMs).toEqual(expect.any(Number));
  });
});
