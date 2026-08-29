import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiRequest,
  ApiRequestError,
  getCurrentUser,
  type AuthenticationResponse,
  type PublicUser,
} from './api-client';

const testUser: PublicUser = {
  id: 'user-1',
  email: 'manager@footbid.test',
  username: 'manager_one',
  displayName: 'Manager One',
  avatarUrl: null,
  role: 'USER',
  status: 'ACTIVE',
  lastSeenAt: null,
  createdAt: '2026-08-29T08:00:00.000Z',
  updatedAt: '2026-08-29T08:00:00.000Z',
};

describe('apiRequest', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('combines API validation messages', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: ['Email is invalid.', 'Password is too short.'],
        }),
        {
          status: 400,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    const request = apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    await expect(request).rejects.toEqual(
      new ApiRequestError('Email is invalid. Password is too short.', 400),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/auth\/register$/),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });

  it('refreshes an expired access session', async () => {
    const authentication: AuthenticationResponse = {
      user: testUser,
      accessTokenExpiresAt: '2026-08-29T08:15:00.000Z',
      refreshTokenExpiresAt: '2026-09-05T08:00:00.000Z',
    };

    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            message: 'Authentication required.',
          }),
          {
            status: 401,
            headers: {
              'content-type': 'application/json',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authentication), {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        }),
      );

    await expect(getCurrentUser()).resolves.toEqual(testUser);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/api\/v1\/auth\/refresh$/),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
  });
});
