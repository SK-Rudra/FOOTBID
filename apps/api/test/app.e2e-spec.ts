import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/application.js';
import { UserRole } from '../src/generated/prisma/enums.js';
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

describe('FOOTBID authentication (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const registration = {
    email: 'phase3-auth-user@phase3.test',
    username: 'phase3_auth_user',
    displayName: 'Phase Three User',
    password: 'FootbidPhase3Password1',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    prisma = app.get(PrismaService);

    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: '@phase3.test',
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          endsWith: '@phase3.test',
        },
      },
    });

    await app.close();
  });

  it('keeps health public and protects authenticated routes', async () => {
    const healthResponse = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(healthResponse.body).toMatchObject({
      status: 'ok',
      service: 'footbid-api',
      database: 'connected',
    });

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('rejects invalid and privilege-escalating registration data', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email',
        username: 'x',
        displayName: 'X',
        password: 'weak',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'phase3-forbidden-field@phase3.test',
        username: 'phase3_forbidden',
        displayName: 'Forbidden Field',
        password: 'FootbidPhase3Password1',
        role: 'ADMIN',
      })
      .expect(400);
  });

  it('supports registration, login, rotation, replay protection, RBAC, and logout', async () => {
    const registrationAgent = request.agent(app.getHttpServer());

    const registrationResponse = await registrationAgent
      .post('/api/v1/auth/register')
      .send(registration)
      .expect(201);

    expect(registrationResponse.body.user).toMatchObject({
      email: registration.email,
      username: registration.username,
      displayName: registration.displayName,
      role: UserRole.USER,
    });

    expect(registrationResponse.body.user.passwordHash).toBeUndefined();
    expect(registrationResponse.body.accessToken).toBeUndefined();
    expect(registrationResponse.body.refreshToken).toBeUndefined();

    const registrationCookies = registrationResponse.headers['set-cookie'] as
      string[] | string | undefined;

    const accessCookie = findSetCookie(registrationCookies, 'footbid_access');
    const refreshCookie = findSetCookie(registrationCookies, 'footbid_refresh');

    expect(accessCookie).toContain('HttpOnly');
    expect(accessCookie).toContain('SameSite=Lax');
    expect(accessCookie).toContain('Path=/');

    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('SameSite=Lax');
    expect(refreshCookie).toContain('Path=/api/v1/auth');

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(registration)
      .expect(409);

    const meResponse = await registrationAgent
      .get('/api/v1/auth/me')
      .expect(200);

    expect(meResponse.body).toMatchObject({
      email: registration.email,
      username: registration.username,
    });

    await registrationAgent.get('/api/v1/users').expect(403);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: registration.email,
        password: 'IncorrectPassword1',
      })
      .expect(401);

    const loginAgent = request.agent(app.getHttpServer());

    const loginResponse = await loginAgent
      .post('/api/v1/auth/login')
      .send({
        identifier: registration.username,
        password: registration.password,
      })
      .expect(200);

    const loginCookies = loginResponse.headers['set-cookie'] as
      string[] | string | undefined;

    const originalRefreshCookie = cookiePair(
      findSetCookie(loginCookies, 'footbid_refresh'),
    );

    const refreshResponse = await loginAgent
      .post('/api/v1/auth/refresh')
      .expect(200);

    const refreshedCookies = refreshResponse.headers['set-cookie'] as
      string[] | string | undefined;

    const rotatedRefreshCookie = cookiePair(
      findSetCookie(refreshedCookies, 'footbid_refresh'),
    );

    expect(rotatedRefreshCookie).not.toBe(originalRefreshCookie);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalRefreshCookie)
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', rotatedRefreshCookie)
      .expect(401);

    const adminAgent = request.agent(app.getHttpServer());

    await adminAgent
      .post('/api/v1/auth/login')
      .send({
        identifier: registration.email,
        password: registration.password,
      })
      .expect(200);

    const userId = registrationResponse.body.user.id as string;

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: UserRole.ADMIN,
      },
    });

    const usersResponse = await adminAgent.get('/api/v1/users').expect(200);

    const listedUsers = usersResponse.body as Array<Record<string, unknown>>;

    expect(listedUsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: userId,
          role: UserRole.ADMIN,
        }),
      ]),
    );

    expect(listedUsers.every((user) => !('passwordHash' in user))).toBe(true);

    const logoutResponse = await adminAgent
      .post('/api/v1/auth/logout')
      .expect(204);

    const clearedCookies = logoutResponse.headers['set-cookie'] as
      string[] | string | undefined;

    findSetCookie(clearedCookies, 'footbid_access');
    findSetCookie(clearedCookies, 'footbid_refresh');

    await adminAgent.get('/api/v1/auth/me').expect(401);
  });
});
