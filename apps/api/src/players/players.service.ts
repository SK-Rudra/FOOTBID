import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PlayerPosition } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  type QueryPlayersDto,
  PlayerSortField,
} from './dto/query-players.dto.js';

const playerListSelect = {
  id: true,
  fullName: true,
  shortName: true,
  nationalityCode: true,
  primaryPosition: true,
  secondaryPositions: true,
  preferredFoot: true,
  overall: true,
  pace: true,
  shooting: true,
  passing: true,
  dribbling: true,
  defending: true,
  physical: true,
  goalkeeping: true,
  marketValue: true,
  imageUrl: true,
  imageLicense: true,
  club: {
    select: {
      id: true,
      name: true,
      shortName: true,
      countryCode: true,
    },
  },
  league: {
    select: {
      id: true,
      name: true,
      slug: true,
      countryCode: true,
    },
  },
} as const;

const playerDetailSelect = {
  ...playerListSelect,
  dateOfBirth: true,
  dataVersion: true,
  updatedAt: true,
} as const;

function exposeLicensedImage<
  T extends {
    imageUrl: string | null;
    imageLicense: string | null;
  },
>(player: T) {
  const { imageUrl, imageLicense, ...publicPlayer } = player;

  return {
    ...publicPlayer,
    image:
      imageUrl && imageLicense
        ? {
            url: imageUrl,
            license: imageLicense,
          }
        : null,
  };
}

@Injectable()
export class PlayersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryPlayersDto) {
    if (
      query.minOverall !== undefined &&
      query.maxOverall !== undefined &&
      query.minOverall > query.maxOverall
    ) {
      throw new BadRequestException(
        'minOverall cannot be greater than maxOverall.',
      );
    }

    const conditions: Prisma.PlayerWhereInput[] = [];
    const search = query.search?.trim();

    if (search) {
      conditions.push({
        OR: [
          {
            fullName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            shortName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            club: {
              is: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            league: {
              is: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
        ],
      });
    }

    if (query.position) {
      conditions.push({
        OR: [
          {
            primaryPosition: query.position,
          },
          {
            secondaryPositions: {
              has: query.position,
            },
          },
        ],
      });
    }

    const where: Prisma.PlayerWhereInput = {
      isActive: true,
      leagueId: query.leagueId,
      clubId: query.clubId,
      nationalityCode: query.nationalityCode,
      overall:
        query.minOverall !== undefined || query.maxOverall !== undefined
          ? {
              gte: query.minOverall,
              lte: query.maxOverall,
            }
          : undefined,
      AND: conditions,
    };

    const orderBy: Prisma.PlayerOrderByWithRelationInput = {
      [query.sortBy ?? PlayerSortField.OVERALL]: query.sortOrder,
    };

    const skip = (query.page - 1) * query.pageSize;

    const [players, total] = await this.prisma.$transaction([
      this.prisma.player.findMany({
        where,
        select: playerListSelect,
        orderBy: [orderBy, { id: 'asc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.player.count({ where }),
    ]);

    return {
      data: players.map(exposeLicensedImage),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getFilters() {
    const [leagues, clubs, nationalities] = await Promise.all([
      this.prisma.league.findMany({
        where: {
          players: {
            some: {
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          countryCode: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.club.findMany({
        where: {
          players: {
            some: {
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          leagueId: true,
          name: true,
          shortName: true,
          countryCode: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.prisma.player.findMany({
        where: {
          isActive: true,
        },
        distinct: ['nationalityCode'],
        select: {
          nationalityCode: true,
        },
        orderBy: {
          nationalityCode: 'asc',
        },
      }),
    ]);

    return {
      positions: Object.values(PlayerPosition),
      leagues,
      clubs,
      nationalities: nationalities.map(
        ({ nationalityCode }) => nationalityCode,
      ),
    };
  }

  async findOne(id: string) {
    const player = await this.prisma.player.findFirst({
      where: {
        id,
        isActive: true,
      },
      select: playerDetailSelect,
    });

    if (!player) {
      throw new NotFoundException('Player not found.');
    }

    return exposeLicensedImage(player);
  }
}
