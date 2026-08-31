import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ManagerSortField,
  type QueryManagersDto,
} from './dto/query-managers.dto.js';

const availableManagerWhere = {
  isActive: true,
  isNeutral: false,
} as const;

const managerListSelect = {
  id: true,
  fullName: true,
  nationalityCode: true,
  tacticalStyle: true,
  preferredFormations: true,
  passingPhilosophy: true,
  defensivePhilosophy: true,
  pressingStyle: true,
  overall: true,
  attacking: true,
  defending: true,
  adaptability: true,
  manManagement: true,
  attackingBonus: true,
  midfieldBonus: true,
  defendingBonus: true,
  chemistryBonus: true,
  marketValue: true,
  tier: true,
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

const managerDetailSelect = {
  ...managerListSelect,
  dataVersion: true,
  updatedAt: true,
} as const;

function exposeLicensedImage<
  T extends {
    imageUrl: string | null;
    imageLicense: string | null;
  },
>(manager: T) {
  const { imageUrl, imageLicense, ...publicManager } = manager;

  return {
    ...publicManager,
    image:
      imageUrl && imageLicense
        ? {
            url: imageUrl,
            license: imageLicense,
          }
        : null,
  };
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

@Injectable()
export class ManagersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryManagersDto) {
    if (
      query.minOverall !== undefined &&
      query.maxOverall !== undefined &&
      query.minOverall > query.maxOverall
    ) {
      throw new BadRequestException(
        'minOverall cannot be greater than maxOverall.',
      );
    }

    const conditions: Prisma.ManagerWhereInput[] = [];
    const search = query.search?.trim();
    const tacticalStyle = query.tacticalStyle?.trim();
    const preferredFormation = query.preferredFormation?.trim();

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
            tacticalStyle: {
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

    if (tacticalStyle) {
      conditions.push({
        tacticalStyle: {
          equals: tacticalStyle,
          mode: 'insensitive',
        },
      });
    }

    if (preferredFormation) {
      conditions.push({
        preferredFormations: {
          has: preferredFormation,
        },
      });
    }

    const where: Prisma.ManagerWhereInput = {
      ...availableManagerWhere,
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

    const orderBy: Prisma.ManagerOrderByWithRelationInput = {
      [query.sortBy ?? ManagerSortField.OVERALL]: query.sortOrder,
    };

    const skip = (query.page - 1) * query.pageSize;

    const [managers, total] = await this.prisma.$transaction([
      this.prisma.manager.findMany({
        where,
        select: managerListSelect,
        orderBy: [orderBy, { id: 'asc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.manager.count({ where }),
    ]);

    return {
      data: managers.map(exposeLicensedImage),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getFilters() {
    const [leagues, clubs, managerFacets] = await Promise.all([
      this.prisma.league.findMany({
        where: {
          managers: {
            some: availableManagerWhere,
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
          managers: {
            some: availableManagerWhere,
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
      this.prisma.manager.findMany({
        where: availableManagerWhere,
        select: {
          nationalityCode: true,
          tacticalStyle: true,
          preferredFormations: true,
          passingPhilosophy: true,
          defensivePhilosophy: true,
          pressingStyle: true,
        },
      }),
    ]);

    return {
      leagues,
      clubs,
      nationalities: uniqueSorted(
        managerFacets.map(({ nationalityCode }) => nationalityCode),
      ),
      tacticalStyles: uniqueSorted(
        managerFacets.map(({ tacticalStyle }) => tacticalStyle),
      ),
      preferredFormations: uniqueSorted(
        managerFacets.flatMap(({ preferredFormations }) => preferredFormations),
      ),
      passingPhilosophies: uniqueSorted(
        managerFacets.map(({ passingPhilosophy }) => passingPhilosophy),
      ),
      defensivePhilosophies: uniqueSorted(
        managerFacets.map(({ defensivePhilosophy }) => defensivePhilosophy),
      ),
      pressingStyles: uniqueSorted(
        managerFacets.map(({ pressingStyle }) => pressingStyle),
      ),
    };
  }

  async findOne(id: string) {
    const manager = await this.prisma.manager.findFirst({
      where: {
        id,
        ...availableManagerWhere,
      },
      select: managerDetailSelect,
    });

    if (!manager) {
      throw new NotFoundException('Manager not found.');
    }

    return exposeLicensedImage(manager);
  }
}
