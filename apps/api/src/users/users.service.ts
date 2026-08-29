import { Injectable } from '@nestjs/common';
import type { AccountStatus, UserRole } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  role: true,
  status: true,
  lastSeenAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface PublicUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  status: AccountStatus;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthUserRecord extends PublicUser {
  passwordHash: string;
}

export interface CreateUserInput {
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findIdentityConflict(
    email: string,
    username: string,
  ): Promise<{ email: string; username: string } | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: {
        email: true,
        username: true,
      },
    });
  }

  findForAuthentication(identifier: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      select: {
        ...publicUserSelect,
        passwordHash: true,
      },
    });
  }

  findPublicById(id: string): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  }

  create(input: CreateUserInput): Promise<PublicUser> {
    return this.prisma.user.create({
      data: input,
      select: publicUserSelect,
    });
  }

  listPublicUsers(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });
  }

  async updateLastSeen(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastSeenAt: new Date(),
      },
    });
  }
}
