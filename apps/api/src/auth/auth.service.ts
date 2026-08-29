import {
  ConflictException,
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  argon2id,
  hash as hashPassword,
  verify as verifyPassword,
} from 'argon2';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { AccountStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type AuthUserRecord,
  type PublicUser,
  UsersService,
} from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type {
  AuthenticatedIdentity,
  AuthenticationResult,
  AuthTokenPayload,
  AuthTokenType,
  RequestMetadata,
  TokenPair,
} from './auth.types.js';

const passwordHashOptions = {
  type: argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;
  private readonly issuer: string;
  private readonly audience: string;

  private dummyPasswordHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessSecret = this.config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.refreshSecret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');

    this.accessTtlSeconds = this.config.getOrThrow<number>(
      'JWT_ACCESS_TTL_SECONDS',
    );

    this.refreshTtlSeconds = this.config.getOrThrow<number>(
      'JWT_REFRESH_TTL_SECONDS',
    );

    this.issuer = this.config.getOrThrow<string>('JWT_ISSUER');
    this.audience = this.config.getOrThrow<string>('JWT_AUDIENCE');
  }

  async onModuleInit(): Promise<void> {
    this.dummyPasswordHash = await hashPassword(
      randomUUID(),
      passwordHashOptions,
    );
  }

  async register(
    dto: RegisterDto,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const email = dto.email.trim().toLowerCase();
    const username = dto.username.trim().toLowerCase();

    const conflict = await this.users.findIdentityConflict(email, username);

    if (conflict) {
      throw new ConflictException('Email or username is already registered.');
    }

    const passwordHash = await hashPassword(dto.password, passwordHashOptions);

    let user: PublicUser;

    try {
      user = await this.users.create({
        email,
        username,
        displayName: dto.displayName.trim(),
        passwordHash,
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Email or username is already registered.');
      }

      throw error;
    }

    return this.createAuthenticatedSession(user, metadata);
  }

  async login(
    dto: LoginDto,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.users.findForAuthentication(identifier);

    const passwordMatches = user
      ? await verifyPassword(user.passwordHash, dto.password)
      : await verifyPassword(this.dummyPasswordHash, dto.password);

    if (!user || !passwordMatches || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.users.updateLastSeen(user.id);

    return this.createAuthenticatedSession(this.toPublicUser(user), metadata);
  }

  async refresh(
    refreshToken: string,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const payload = await this.verifyToken(refreshToken, 'refresh');

    const session = await this.prisma.authSession.findUnique({
      where: { id: payload.sid },
    });

    const now = new Date();

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= now
    ) {
      throw new UnauthorizedException(
        'Invalid or expired authentication session.',
      );
    }

    const presentedHash = this.hashRefreshToken(refreshToken);

    if (!this.refreshHashesMatch(session.refreshTokenHash, presentedHash)) {
      await this.prisma.authSession.updateMany({
        where: {
          id: session.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      throw new UnauthorizedException(
        'Invalid or expired authentication session.',
      );
    }

    const user = await this.users.findPublicById(payload.sub);

    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Invalid or expired authentication session.',
      );
    }

    const tokens = await this.issueTokens(user, session.id);
    const sessionMetadata = this.normalizeMetadata(metadata);

    const rotationResult = await this.prisma.authSession.updateMany({
      where: {
        id: session.id,
        userId: user.id,
        refreshTokenHash: presentedHash,
        revokedAt: null,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
        expiresAt: tokens.refreshTokenExpiresAt,
        lastUsedAt: now,
        userAgent: sessionMetadata.userAgent,
        ipAddress: sessionMetadata.ipAddress,
      },
    });

    if (rotationResult.count !== 1) {
      throw new UnauthorizedException(
        'Invalid or expired authentication session.',
      );
    }

    return {
      user,
      tokens,
    };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = await this.verifyToken(refreshToken, 'refresh', true);

      await this.prisma.authSession.updateMany({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    } catch {
      // Cookies are still cleared even when a token is invalid or expired.
    }
  }

  async getAuthenticatedUser(userId: string): Promise<PublicUser | null> {
    return this.users.findPublicById(userId);
  }

  async validateAccessToken(
    accessToken: string,
  ): Promise<AuthenticatedIdentity> {
    const payload = await this.verifyToken(accessToken, 'access');

    const session = await this.prisma.authSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Authentication required.');
    }

    const user = await this.users.findPublicById(payload.sub);

    if (!user || user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Authentication required.');
    }

    return {
      userId: user.id,
      sessionId: session.id,
      role: user.role,
    };
  }

  private async createAuthenticatedSession(
    user: PublicUser,
    metadata: RequestMetadata,
  ): Promise<AuthenticationResult> {
    const sessionId = randomUUID();

    const tokens = await this.issueTokens(user, sessionId);

    const sessionMetadata = this.normalizeMetadata(metadata);

    await this.prisma.authSession.create({
      data: {
        id: sessionId,
        refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
        expiresAt: tokens.refreshTokenExpiresAt,
        userAgent: sessionMetadata.userAgent,
        ipAddress: sessionMetadata.ipAddress,
        user: {
          connect: { id: user.id },
        },
      },
    });

    return {
      user,
      tokens,
    };
  }

  private async issueTokens(
    user: PublicUser,
    sessionId: string,
  ): Promise<TokenPair> {
    const issuedAt = Date.now();

    const accessTokenExpiresAt = new Date(
      issuedAt + this.accessTtlSeconds * 1000,
    );

    const refreshTokenExpiresAt = new Date(
      issuedAt + this.refreshTtlSeconds * 1000,
    );

    const basePayload = {
      sub: user.id,
      sid: sessionId,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          ...basePayload,
          type: 'access',
        } satisfies AuthTokenPayload,
        {
          secret: this.accessSecret,
          expiresIn: this.accessTtlSeconds,
          issuer: this.issuer,
          audience: this.audience,
          jwtid: randomUUID(),
        },
      ),

      this.jwt.signAsync(
        {
          ...basePayload,
          type: 'refresh',
        } satisfies AuthTokenPayload,
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshTtlSeconds,
          issuer: this.issuer,
          audience: this.audience,
          jwtid: randomUUID(),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
    };
  }

  private async verifyToken(
    token: string,
    expectedType: AuthTokenType,
    ignoreExpiration = false,
  ): Promise<AuthTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<AuthTokenPayload>(token, {
        secret:
          expectedType === 'access' ? this.accessSecret : this.refreshSecret,
        issuer: this.issuer,
        audience: this.audience,
        ignoreExpiration,
      });

      if (
        payload.type !== expectedType ||
        typeof payload.sub !== 'string' ||
        typeof payload.sid !== 'string'
      ) {
        throw new Error('Unexpected JWT payload.');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Authentication required.');
    }
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private refreshHashesMatch(
    storedHash: string,
    presentedHash: string,
  ): boolean {
    const storedBuffer = Buffer.from(storedHash, 'hex');

    const presentedBuffer = Buffer.from(presentedHash, 'hex');

    return (
      storedBuffer.length === presentedBuffer.length &&
      timingSafeEqual(storedBuffer, presentedBuffer)
    );
  }

  private normalizeMetadata(metadata: RequestMetadata): RequestMetadata {
    return {
      ipAddress: metadata.ipAddress?.slice(0, 45) ?? null,
      userAgent: metadata.userAgent?.slice(0, 512) ?? null,
    };
  }

  private toPublicUser(user: AuthUserRecord): PublicUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
