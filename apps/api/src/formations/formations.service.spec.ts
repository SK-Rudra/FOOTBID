import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentTier } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  FormationSortDirection,
  FormationSortField,
  QueryFormationsDto,
} from './dto/query-formations.dto.js';
import { FormationsService } from './formations.service.js';

function createPrismaMock() {
  const formationFindMany = vi.fn();
  const formationCount = vi.fn();
  const formationFindFirst = vi.fn();
  const formationAggregate = vi.fn();

  const transaction = vi.fn(async (operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );

  const prisma = {
    formation: {
      findMany: formationFindMany,
      count: formationCount,
      findFirst: formationFindFirst,
      aggregate: formationAggregate,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  return {
    prisma,
    formationFindMany,
    formationCount,
    formationFindFirst,
    formationAggregate,
    transaction,
  };
}

const formationRecord = {
  id: 'formation-1',
  code: '4-3-3',
  name: 'Attacking 4-3-3',
  description: 'Wide attacking shape with coordinated pressing.',
  shape: {
    version: 1,
    slots: [],
  },
  buildUpStyle: 'Fast Build Up',
  attackingStyle: 'Wide',
  defensiveStyle: 'Front Foot',
  width: 68,
  tempo: 72,
  pressingIntensity: 70,
  attackingBonus: 2,
  midfieldBonus: 1,
  defendingBonus: 0,
  chemistryBonus: 1,
  marketValue: 10_000_000,
  tier: ContentTier.PREMIUM,
  isNeutral: false,
};

describe('FormationsService', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let service: FormationsService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new FormationsService(prismaMock.prisma);
  });

  it('returns filtered and paginated active formations', async () => {
    prismaMock.formationFindMany.mockResolvedValue([formationRecord]);
    prismaMock.formationCount.mockResolvedValue(1);

    const query = Object.assign(new QueryFormationsDto(), {
      search: 'attacking',
      buildUpStyle: 'Fast Build Up',
      attackingStyle: 'Wide',
      defensiveStyle: 'Front Foot',
      tier: ContentTier.PREMIUM,
      minMarketValue: 5_000_000,
      maxMarketValue: 15_000_000,
      sortBy: FormationSortField.MARKET_VALUE,
      sortOrder: FormationSortDirection.DESC,
      page: 1,
      pageSize: 12,
    });

    const result = await service.findAll(query);

    expect(prismaMock.formationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          tier: ContentTier.PREMIUM,
          marketValue: {
            gte: 5_000_000,
            lte: 15_000_000,
          },
        }),
        skip: 0,
        take: 12,
      }),
    );

    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 12,
      total: 1,
      totalPages: 1,
    });

    expect(result.data[0]).toMatchObject({
      id: 'formation-1',
      code: '4-3-3',
      isNeutral: false,
      attackingBonus: 2,
      marketValue: 10_000_000,
    });
  });

  it('keeps the active neutral fallback visible in the catalogue', async () => {
    prismaMock.formationFindMany.mockResolvedValue([
      {
        ...formationRecord,
        id: 'formation-basic',
        code: '4-4-2-basic',
        name: 'Basic 4-4-2',
        tier: ContentTier.FREE,
        isNeutral: true,
        marketValue: 0,
      },
    ]);
    prismaMock.formationCount.mockResolvedValue(1);

    const result = await service.findAll(new QueryFormationsDto());
    const findArguments = prismaMock.formationFindMany.mock.calls[0]?.[0];

    expect(findArguments.where).not.toHaveProperty('isNeutral');
    expect(result.data[0]).toMatchObject({
      code: '4-4-2-basic',
      isNeutral: true,
      marketValue: 0,
    });
  });

  it('rejects an invalid market-value range', async () => {
    const query = Object.assign(new QueryFormationsDto(), {
      minMarketValue: 20_000_000,
      maxMarketValue: 10_000_000,
    });

    await expect(service.findAll(query)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prismaMock.transaction).not.toHaveBeenCalled();
  });

  it('returns unique sorted formation filter metadata and value limits', async () => {
    prismaMock.formationFindMany.mockResolvedValue([
      {
        buildUpStyle: 'Fast Build Up',
        attackingStyle: 'Wide',
        defensiveStyle: 'Front Foot',
        tier: ContentTier.PREMIUM,
      },
      {
        buildUpStyle: 'Balanced',
        attackingStyle: 'Balanced',
        defensiveStyle: 'Balanced',
        tier: ContentTier.FREE,
      },
      {
        buildUpStyle: 'Fast Build Up',
        attackingStyle: 'Wide',
        defensiveStyle: 'Front Foot',
        tier: ContentTier.PREMIUM,
      },
    ]);

    prismaMock.formationAggregate.mockResolvedValue({
      _min: {
        marketValue: 0,
      },
      _max: {
        marketValue: 10_000_000,
      },
    });

    const result = await service.getFilters();

    expect(result.buildUpStyles).toEqual(['Balanced', 'Fast Build Up']);
    expect(result.attackingStyles).toEqual(['Balanced', 'Wide']);
    expect(result.defensiveStyles).toEqual(['Balanced', 'Front Foot']);
    expect(result.tiers).toEqual(['FREE', 'PREMIUM']);
    expect(result.marketValueRange).toEqual({
      min: 0,
      max: 10_000_000,
    });
  });

  it('rejects an inactive or missing formation detail request', async () => {
    prismaMock.formationFindFirst.mockResolvedValue(null);

    await expect(service.findOne('missing-formation')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prismaMock.formationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'missing-formation',
          isActive: true,
        },
      }),
    );
  });
});
