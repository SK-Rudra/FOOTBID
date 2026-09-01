import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  FormationSortField,
  type QueryFormationsDto,
} from './dto/query-formations.dto.js';

const availableFormationWhere = {
  isActive: true,
} as const;

const formationListSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  shape: true,
  buildUpStyle: true,
  attackingStyle: true,
  defensiveStyle: true,
  width: true,
  tempo: true,
  pressingIntensity: true,
  attackingBonus: true,
  midfieldBonus: true,
  defendingBonus: true,
  chemistryBonus: true,
  marketValue: true,
  tier: true,
  isNeutral: true,
} as const;

const formationDetailSelect = {
  ...formationListSelect,
  dataVersion: true,
  updatedAt: true,
} as const;

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

@Injectable()
export class FormationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryFormationsDto) {
    if (
      query.minMarketValue !== undefined &&
      query.maxMarketValue !== undefined &&
      query.minMarketValue > query.maxMarketValue
    ) {
      throw new BadRequestException(
        'minMarketValue cannot be greater than maxMarketValue.',
      );
    }

    const conditions: Prisma.FormationWhereInput[] = [];
    const search = query.search?.trim();
    const buildUpStyle = query.buildUpStyle?.trim();
    const attackingStyle = query.attackingStyle?.trim();
    const defensiveStyle = query.defensiveStyle?.trim();

    if (search) {
      conditions.push({
        OR: [
          {
            code: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            buildUpStyle: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            attackingStyle: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            defensiveStyle: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      });
    }

    if (buildUpStyle) {
      conditions.push({
        buildUpStyle: {
          equals: buildUpStyle,
          mode: 'insensitive',
        },
      });
    }

    if (attackingStyle) {
      conditions.push({
        attackingStyle: {
          equals: attackingStyle,
          mode: 'insensitive',
        },
      });
    }

    if (defensiveStyle) {
      conditions.push({
        defensiveStyle: {
          equals: defensiveStyle,
          mode: 'insensitive',
        },
      });
    }

    const where: Prisma.FormationWhereInput = {
      ...availableFormationWhere,
      tier: query.tier,
      marketValue:
        query.minMarketValue !== undefined || query.maxMarketValue !== undefined
          ? {
              gte: query.minMarketValue,
              lte: query.maxMarketValue,
            }
          : undefined,
      AND: conditions,
    };

    const orderBy: Prisma.FormationOrderByWithRelationInput = {
      [query.sortBy ?? FormationSortField.NAME]: query.sortOrder,
    };

    const skip = (query.page - 1) * query.pageSize;

    const [formations, total] = await this.prisma.$transaction([
      this.prisma.formation.findMany({
        where,
        select: formationListSelect,
        orderBy: [orderBy, { id: 'asc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.formation.count({ where }),
    ]);

    return {
      data: formations,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getFilters() {
    const [facets, valueRange] = await this.prisma.$transaction([
      this.prisma.formation.findMany({
        where: availableFormationWhere,
        select: {
          buildUpStyle: true,
          attackingStyle: true,
          defensiveStyle: true,
          tier: true,
        },
      }),
      this.prisma.formation.aggregate({
        where: availableFormationWhere,
        _min: {
          marketValue: true,
        },
        _max: {
          marketValue: true,
        },
      }),
    ]);

    return {
      buildUpStyles: uniqueSorted(
        facets.map(({ buildUpStyle }) => buildUpStyle),
      ),
      attackingStyles: uniqueSorted(
        facets.map(({ attackingStyle }) => attackingStyle),
      ),
      defensiveStyles: uniqueSorted(
        facets.map(({ defensiveStyle }) => defensiveStyle),
      ),
      tiers: uniqueSorted(facets.map(({ tier }) => tier)),
      marketValueRange: {
        min: valueRange._min.marketValue ?? 0,
        max: valueRange._max.marketValue ?? 0,
      },
    };
  }

  async findOne(id: string) {
    const formation = await this.prisma.formation.findFirst({
      where: {
        id,
        ...availableFormationWhere,
      },
      select: formationDetailSelect,
    });

    if (!formation) {
      throw new NotFoundException('Formation not found.');
    }

    return formation;
  }
}
