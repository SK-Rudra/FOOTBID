import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/application.js';
import {
  PlayerPosition,
  PreferredFoot,
} from '../src/generated/prisma/enums.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('FOOTBID player catalog (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let leagueId: string;
  let clubId: string;
  let playerId: string;

  const sourceProvider = 'footbid-phase5-e2e';

  async function removeFixtures(): Promise<void> {
    await prisma.player.deleteMany({
      where: {
        sourceProvider,
      },
    });

    await prisma.club.deleteMany({
      where: {
        sourceProvider,
      },
    });

    await prisma.league.deleteMany({
      where: {
        sourceProvider,
      },
    });
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();

    prisma = app.get(PrismaService);

    await removeFixtures();

    const league = await prisma.league.create({
      data: {
        name: 'Phase Five Test League',
        slug: 'phase-five-test-league',
        countryCode: 'BD',
        sourceProvider,
        sourceLeagueId: 'phase5-league',
        dataVersion: 'e2e',
      },
    });

    leagueId = league.id;

    const club = await prisma.club.create({
      data: {
        leagueId,
        name: 'Harbour Circuit',
        shortName: 'HBC',
        countryCode: 'BD',
        sourceProvider,
        sourceClubId: 'phase5-club',
        dataVersion: 'e2e',
      },
    });

    clubId = club.id;

    await prisma.player.createMany({
      data: [
        {
          leagueId,
          clubId,
          fullName: 'Nora Vale',
          shortName: 'N. Vale',
          nationalityCode: 'BD',
          primaryPosition: PlayerPosition.CAM,
          secondaryPositions: [PlayerPosition.CM],
          preferredFoot: PreferredFoot.BOTH,
          overall: 91,
          pace: 88,
          shooting: 90,
          passing: 93,
          dribbling: 92,
          defending: 54,
          physical: 73,
          goalkeeping: 8,
          marketValue: 48_000_000,
          sourceProvider,
          sourcePlayerId: 'phase5-player-01',
          dataVersion: 'e2e',
        },
        {
          leagueId,
          clubId,
          fullName: 'Milo Marin',
          shortName: 'M. Marin',
          nationalityCode: 'PT',
          primaryPosition: PlayerPosition.RW,
          secondaryPositions: [PlayerPosition.LW],
          preferredFoot: PreferredFoot.LEFT,
          overall: 84,
          pace: 91,
          shooting: 82,
          passing: 80,
          dribbling: 89,
          defending: 38,
          physical: 67,
          goalkeeping: 7,
          marketValue: 29_000_000,
          imageUrl: 'https://example.test/unlicensed-player.png',
          sourceProvider,
          sourcePlayerId: 'phase5-player-02',
          dataVersion: 'e2e',
        },
        {
          leagueId,
          clubId,
          fullName: 'Ilya Stone',
          shortName: 'I. Stone',
          nationalityCode: 'US',
          primaryPosition: PlayerPosition.CB,
          secondaryPositions: [PlayerPosition.CDM],
          preferredFoot: PreferredFoot.RIGHT,
          overall: 79,
          pace: 70,
          shooting: 42,
          passing: 72,
          dribbling: 65,
          defending: 84,
          physical: 86,
          goalkeeping: 9,
          marketValue: 17_000_000,
          sourceProvider,
          sourcePlayerId: 'phase5-player-03',
          dataVersion: 'e2e',
        },
        {
          leagueId,
          clubId,
          fullName: 'Hidden Player',
          shortName: 'H. Player',
          nationalityCode: 'JP',
          primaryPosition: PlayerPosition.ST,
          secondaryPositions: [],
          preferredFoot: PreferredFoot.RIGHT,
          overall: 99,
          pace: 99,
          shooting: 99,
          passing: 99,
          dribbling: 99,
          defending: 99,
          physical: 99,
          goalkeeping: 99,
          marketValue: 99_000_000,
          sourceProvider,
          sourcePlayerId: 'phase5-player-04',
          dataVersion: 'e2e',
          isActive: false,
        },
      ],
    });

    const player = await prisma.player.findUniqueOrThrow({
      where: {
        sourceProvider_sourcePlayerId: {
          sourceProvider,
          sourcePlayerId: 'phase5-player-02',
        },
      },
    });

    playerId = player.id;
  });

  afterAll(async () => {
    await removeFixtures();
    await app.close();
  });

  it('lists only active players publicly with pagination and sorting', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/players')
      .query({
        leagueId,
        page: 1,
        pageSize: 2,
        sortBy: 'overall',
        sortOrder: 'desc',
      })
      .expect(200);

    expect(response.body.pagination).toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });

    expect(
      response.body.data.map((player: { fullName: string }) => player.fullName),
    ).toEqual(['Nora Vale', 'Milo Marin']);

    for (const player of response.body.data as Array<Record<string, unknown>>) {
      expect(player.image).toBeNull();
      expect(player).not.toHaveProperty('imageUrl');
      expect(player).not.toHaveProperty('imageLicense');
    }
  });

  it('supports search and combined player filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/players')
      .query({
        leagueId,
        search: 'marin',
        position: 'LW',
        nationalityCode: 'pt',
        minOverall: 80,
        maxOverall: 90,
        sortBy: 'fullName',
        sortOrder: 'asc',
      })
      .expect(200);

    expect(response.body.pagination.total).toBe(1);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: playerId,
      fullName: 'Milo Marin',
      nationalityCode: 'PT',
      primaryPosition: PlayerPosition.RW,
      secondaryPositions: [PlayerPosition.LW],
    });
  });

  it('returns filter metadata and complete player details', async () => {
    const filtersResponse = await request(app.getHttpServer())
      .get('/api/v1/players/filters')
      .expect(200);

    expect(filtersResponse.body.positions).toEqual(
      expect.arrayContaining([PlayerPosition.RW, PlayerPosition.LW]),
    );

    expect(filtersResponse.body.leagues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: leagueId,
          name: 'Phase Five Test League',
        }),
      ]),
    );

    expect(filtersResponse.body.clubs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: clubId,
          leagueId,
          name: 'Harbour Circuit',
        }),
      ]),
    );

    expect(filtersResponse.body.nationalities).toEqual(
      expect.arrayContaining(['BD', 'PT', 'US']),
    );
    expect(filtersResponse.body.nationalities).not.toContain('JP');

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/players/${playerId}`)
      .expect(200);

    expect(detailResponse.body).toMatchObject({
      id: playerId,
      fullName: 'Milo Marin',
      overall: 84,
      pace: 91,
      shooting: 82,
      passing: 80,
      dribbling: 89,
      defending: 38,
      physical: 67,
      image: null,
      club: {
        id: clubId,
        name: 'Harbour Circuit',
      },
      league: {
        id: leagueId,
        name: 'Phase Five Test League',
      },
    });

    expect(detailResponse.body).not.toHaveProperty('imageUrl');
    expect(detailResponse.body).not.toHaveProperty('imageLicense');
    expect(detailResponse.body).not.toHaveProperty('sourceProvider');

    await request(app.getHttpServer())
      .get('/api/v1/players/missing-player-id')
      .expect(404);
  });

  it('rejects invalid catalog queries', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/players')
      .query({
        minOverall: 90,
        maxOverall: 80,
      })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/players')
      .query({
        position: 'INVALID',
      })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/players')
      .query({
        pageSize: 51,
      })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/v1/players')
      .query({
        unexpectedField: 'forbidden',
      })
      .expect(400);
  });
});
