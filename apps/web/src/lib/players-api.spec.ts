import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPlayerCatalogPath, getPlayer, getPlayerFilters, getPlayers } from './players-api';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('./api-client', () => ({
  apiRequest: apiRequestMock,
}));

describe('players API', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({});
  });

  it('builds a normalized catalog query', async () => {
    const path = buildPlayerCatalogPath({
      search: '  Milo Marin  ',
      position: 'RW',
      leagueId: 'league-1',
      clubId: 'club-1',
      nationalityCode: 'PT',
      minOverall: 80,
      maxOverall: 90,
      sortBy: 'overall',
      sortOrder: 'desc',
      page: 2,
      pageSize: 12,
    });

    expect(path).toBe(
      '/api/v1/players?search=Milo+Marin&position=RW&leagueId=league-1&clubId=club-1&nationalityCode=PT&minOverall=80&maxOverall=90&sortBy=overall&sortOrder=desc&page=2&pageSize=12',
    );

    await getPlayers({
      search: 'Milo',
      page: 1,
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/players?search=Milo&page=1', {});
  });

  it('requests filters and safely encodes player identifiers', async () => {
    await getPlayerFilters();
    await getPlayer('player/id');

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/api/v1/players/filters', {});

    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/api/v1/players/player%2Fid', {});
  });
});
