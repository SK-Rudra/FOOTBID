import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthCookieService } from './auth-cookie.service.js';
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE_PATH,
  REFRESH_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE_PATH,
} from './auth.constants.js';
import type { TokenPair } from './auth.types.js';

function createConfigService(
  nodeEnvironment: 'development' | 'production',
): ConfigService {
  return {
    getOrThrow: vi.fn().mockReturnValue(nodeEnvironment),
  } as unknown as ConfigService;
}

function createResponseMock(): {
  response: Response;
  cookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
} {
  const cookie = vi.fn();
  const clearCookie = vi.fn();

  return {
    response: {
      cookie,
      clearCookie,
    } as unknown as Response,
    cookie,
    clearCookie,
  };
}

describe('AuthCookieService', () => {
  const now = new Date('2026-08-29T08:00:00.000Z');

  const tokens: TokenPair = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiresAt: new Date(now.getTime() + 15 * 60 * 1000),
    refreshTokenExpiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets HttpOnly development cookies with restricted paths', () => {
    const service = new AuthCookieService(createConfigService('development'));
    const { response, cookie } = createResponseMock();

    service.setAuthenticationCookies(response, tokens);

    expect(cookie).toHaveBeenNthCalledWith(
      1,
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: ACCESS_TOKEN_COOKIE_PATH,
        maxAge: 15 * 60 * 1000,
      },
    );

    expect(cookie).toHaveBeenNthCalledWith(
      2,
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: REFRESH_TOKEN_COOKIE_PATH,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    );
  });

  it('enables Secure cookies in production', () => {
    const service = new AuthCookieService(createConfigService('production'));
    const { response, cookie } = createResponseMock();

    service.setAuthenticationCookies(response, tokens);

    expect(cookie).toHaveBeenNthCalledWith(
      1,
      ACCESS_TOKEN_COOKIE,
      tokens.accessToken,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      }),
    );

    expect(cookie).toHaveBeenNthCalledWith(
      2,
      REFRESH_TOKEN_COOKIE,
      tokens.refreshToken,
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
      }),
    );
  });

  it('clears both cookies using their original paths', () => {
    const service = new AuthCookieService(createConfigService('development'));
    const { response, clearCookie } = createResponseMock();

    service.clearAuthenticationCookies(response);

    expect(clearCookie).toHaveBeenNthCalledWith(1, ACCESS_TOKEN_COOKIE, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: ACCESS_TOKEN_COOKIE_PATH,
    });

    expect(clearCookie).toHaveBeenNthCalledWith(2, REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: REFRESH_TOKEN_COOKIE_PATH,
    });
  });
});
