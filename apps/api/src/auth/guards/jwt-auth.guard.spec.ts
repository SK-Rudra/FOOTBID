import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants.js';
import type { AuthenticatedRequest } from '../authenticated-request.js';
import { AuthService } from '../auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

function createContext(
  request: Partial<AuthenticatedRequest>,
): ExecutionContext {
  class TestController {}

  return {
    getHandler: () => () => undefined,
    getClass: () => TestController,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const getAllAndOverride = vi.fn();
  const validateAccessToken = vi.fn();

  let guard: JwtAuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();

    const reflector = {
      getAllAndOverride,
    } as unknown as Reflector;

    const authService = {
      validateAccessToken,
    } as unknown as AuthService;

    guard = new JwtAuthGuard(reflector, authService);
  });

  it('allows routes marked as public', async () => {
    getAllAndOverride.mockReturnValue(true);

    const result = await guard.canActivate(createContext({ cookies: {} }));

    expect(result).toBe(true);
    expect(validateAccessToken).not.toHaveBeenCalled();
  });

  it('rejects requests without an access-token cookie', async () => {
    getAllAndOverride.mockReturnValue(false);

    await expect(
      guard.canActivate(createContext({ cookies: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(validateAccessToken).not.toHaveBeenCalled();
  });

  it('validates the access token and attaches the identity', async () => {
    getAllAndOverride.mockReturnValue(false);

    const identity = {
      userId: 'user-1',
      sessionId: 'session-1',
      role: UserRole.USER,
    };

    validateAccessToken.mockResolvedValue(identity);

    const request = {
      cookies: {
        [ACCESS_TOKEN_COOKIE]: 'valid-access-token',
      },
    } as Partial<AuthenticatedRequest>;

    const result = await guard.canActivate(createContext(request));

    expect(result).toBe(true);
    expect(validateAccessToken).toHaveBeenCalledWith('valid-access-token');
    expect(request.auth).toEqual(identity);
  });
});
