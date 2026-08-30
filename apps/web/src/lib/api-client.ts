export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'BANNED';
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticationResponse {
  user: PublicUser;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let errorBody: ApiErrorBody | null = null;

    try {
      errorBody = (await response.json()) as ApiErrorBody;
    } catch {
      // The fallback message below handles non-JSON errors.
    }

    const apiMessage = errorBody?.message;

    const message = Array.isArray(apiMessage)
      ? apiMessage.join(' ')
      : (apiMessage ?? errorBody?.error ?? 'The request could not be completed.');

    throw new ApiRequestError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getCurrentUser(): Promise<PublicUser> {
  try {
    return await apiRequest<PublicUser>('/api/v1/auth/me');
  } catch (error: unknown) {
    if (!(error instanceof ApiRequestError) || error.status !== 401) {
      throw error;
    }

    const refreshed = await apiRequest<AuthenticationResponse>('/api/v1/auth/refresh', {
      method: 'POST',
    });

    return refreshed.user;
  }
}
