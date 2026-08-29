import type { UserRole } from '../generated/prisma/enums.js';
import type { PublicUser } from '../users/users.service.js';

export type AuthTokenType = 'access' | 'refresh';

export interface AuthTokenPayload {
  sub: string;
  sid: string;
  role: UserRole;
  type: AuthTokenType;
}

export interface RequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

export interface AuthenticationResult {
  user: PublicUser;
  tokens: TokenPair;
}

export interface AuthenticatedIdentity {
  userId: string;
  sessionId: string;
  role: UserRole;
}
