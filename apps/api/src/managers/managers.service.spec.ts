import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentTier } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ManagerSortDirection,
  ManagerSortField,
  QueryManagersDto,
} from './dto/query-managers.dto.js';
import { ManagersService } from './managers.service.js';

function createPrismaMock() {
  const managerFindMany = vi.fn();
  const managerCount = vi.fn();
  const managerFindFirst = vi.fn();
  const leagueFindMany = vi.fn();
  const clubFindMany = vi.fn();

  const transaction = vi.fn(async (operations: Promise<unknown>[]) =>
    Promise.all(operations),
  );

  const prisma = {
    manager: {
      findMany: managerFindMany,
      count: managerCount,
      findFirst: managerFindFirst,
    },
    league: {
      findMany: leagueFindMany,
    },
    club: {
      findMany: clubFindMany,
    },
    $transaction: transaction,
  } as unknown as PrismaService;

  return {
    prisma,
    managerFindMany,
    managerCount,
    managerFindFirst,
    leagueFindMany,
    clubFindMany,
    transaction,
  };
}

const managerRecord = {
  id: 'manager-1',
  fullName: 'Nayeem Rahman',
  nationalityCode: 'BD',
  tacticalStyle: 'High Press',
  preferredFormations: ['4-3-3', '4-4-2'],
  passingPhilosophy: 'Short Passing',
  defensivePhilosophy: 'Front Foot',
  pressingStyle: 'High Press',
  overall: 82,
  attacking: 84,
  defending: 78,
  adaptability: 81,
  manManagement: 83,
  attackingBonus: 3,
  midfieldBonus: 2,
  defendingBonus: 1,
  chemistryBonus: 2,
  marketValue: 12_000_000,
  tier: ContentTier.PREMIUM,
  imageUrl: 'https://images.example.test/manager-1.webp',
  imageLicense: 'CC BY 4.0',
  club: {
    id: 'club-1',
    name: 'Dhaka Comets',
    shortName: 'COMETS',
    countryCode: 'BD',
  },
  league: {
    id: 'league-1',
    name: 'KickoffBid Premier League',
    slug: 'footbid-premier-league',
    countryCode: 'BD',
  },
};

describe('ManagersService', () => {
  let prismaMock: ReturnType<typeof createPrismaMock>;
  let service: ManagersService;

  beforeEach(() => {
    prismaMock = createPrismaMock();
    service = new ManagersService(prismaMock.prisma);
  });

  it('returns paginated auctionable managers with licensed images', async () => {
    prismaMock.managerFindMany.mockResolvedValue([managerRecord]);
    prismaMock.managerCount.mockResolvedValue(1);

    const query = Object.assign(new QueryManagersDto(), {
      search: 'Nayeem',
      tacticalStyle: 'High Press',
      preferredFormation: '4-3-3',
      nationalityCode: 'BD',
      minOverall: 80,
      sortBy: ManagerSortField.MARKET_VALUE,
      sortOrder: ManagerSortDirection.DESC,
      page: 1,
      pageSize: 12,
    });

    const result = await service.findAll(query);

    expect(prismaMock.managerFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          isNeutral: false,
          nationalityCode: 'BD',
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
      id: 'manager-1',
      fullName: 'Nayeem Rahman',
      tacticalStyle: 'High Press',
      image: {
        url: managerRecord.imageUrl,
        license: managerRecord.imageLicense,
      },
    });

    expect(result.data[0]).not.toHaveProperty('imageUrl');
    expect(result.data[0]).not.toHaveProperty('imageLicense');
  });

  it('rejects an invalid overall range', async () => {
    const query = Object.assign(new QueryManagersDto(), {
      minOverall: 90,
      maxOverall: 80,
    });

    await expect(service.findAll(query)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prismaMock.transaction).not.toHaveBeenCalled();
  });

  it('returns unique sorted manager filter metadata', async () => {
    prismaMock.leagueFindMany.mockResolvedValue([
      {
        id: 'league-1',
        name: 'KickoffBid Premier League',
        slug: 'footbid-premier-league',
        countryCode: 'BD',
      },
    ]);

    prismaMock.clubFindMany.mockResolvedValue([
      {
        id: 'club-1',
        leagueId: 'league-1',
        name: 'Dhaka Comets',
        shortName: 'COMETS',
        countryCode: 'BD',
      },
    ]);

    prismaMock.managerFindMany.mockResolvedValue([
      {
        nationalityCode: 'BD',
        tacticalStyle: 'High Press',
        preferredFormations: ['4-3-3', '4-4-2'],
        passingPhilosophy: 'Short Passing',
        defensivePhilosophy: 'Front Foot',
        pressingStyle: 'High Press',
      },
      {
        nationalityCode: 'BD',
        tacticalStyle: 'High Press',
        preferredFormations: ['4-4-2'],
        passingPhilosophy: 'Short Passing',
        defensivePhilosophy: 'Front Foot',
        pressingStyle: 'High Press',
      },
    ]);

    const result = await service.getFilters();

    expect(result.nationalities).toEqual(['BD']);
    expect(result.tacticalStyles).toEqual(['High Press']);
    expect(result.preferredFormations).toEqual(['4-3-3', '4-4-2']);
    expect(result.passingPhilosophies).toEqual(['Short Passing']);
    expect(result.defensivePhilosophies).toEqual(['Front Foot']);
    expect(result.pressingStyles).toEqual(['High Press']);
  });

  it('rejects an unavailable or neutral manager detail request', async () => {
    prismaMock.managerFindFirst.mockResolvedValue(null);

    await expect(service.findOne('missing-manager')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prismaMock.managerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'missing-manager',
          isActive: true,
          isNeutral: false,
        },
      }),
    );
  });
});
