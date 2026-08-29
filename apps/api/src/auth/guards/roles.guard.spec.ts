import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '../../generated/prisma/enums.js';
import type { AuthenticatedRequest } from '../authenticated-request.js';
import { RolesGuard } from './roles.guard.js';

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

describe('RolesGuard', () => {
  const getAllAndOverride = vi.fn();

  let guard: RolesGuard;

  beforeEach(() => {
    vi.clearAllMocks();

    const reflector = {
      getAllAndOverride,
    } as unknown as Reflector;

    guard = new RolesGuard(reflector);
  });

  it('allows authenticated routes without role requirements', () => {
    getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext({}))).toBe(true);
  });

  it('rejects users who do not have the required role', () => {
    getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    const request = {
      auth: {
        userId: 'user-1',
        sessionId: 'session-1',
        role: UserRole.USER,
      },
    };

    expect(() => guard.canActivate(createContext(request))).toThrow(
      ForbiddenException,
    );
  });

  it('allows users who have the required role', () => {
    getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    const request = {
      auth: {
        userId: 'admin-1',
        sessionId: 'session-1',
        role: UserRole.ADMIN,
      },
    };

    expect(guard.canActivate(createContext(request))).toBe(true);
  });
});
