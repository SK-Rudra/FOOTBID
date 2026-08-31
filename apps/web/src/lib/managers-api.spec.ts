import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildManagerCatalogPath, getManagerFilters, getManagers } from './managers-api';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('./api-client', () => ({
  apiRequest: apiRequestMock,
}));

describe('managers API', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({});
  });

  it('builds a normalized manager catalogue query', async () => {
    const path = buildManagerCatalogPath({
      search: '  Nayeem Rahman  ',
      tacticalStyle: 'High Press',
      preferredFormation: '4-3-3-attack',
      leagueId: 'league-1',
      clubId: 'club-1',
      nationalityCode: 'BD',
      minOverall: 80,
      maxOverall: 90,
      sortBy: 'marketValue',
      sortOrder: 'desc',
      page: 2,
      pageSize: 12,
    });

    expect(path).toBe(
      '/api/v1/managers?search=Nayeem+Rahman&tacticalStyle=High+Press&preferredFormation=4-3-3-attack&leagueId=league-1&clubId=club-1&nationalityCode=BD&minOverall=80&maxOverall=90&sortBy=marketValue&sortOrder=desc&page=2&pageSize=12',
    );

    await getManagers({
      search: 'Nayeem',
      page: 1,
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/managers?search=Nayeem&page=1', {});
  });

  it('requests manager filter metadata', async () => {
    await getManagerFilters();

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/managers/filters', {});
  });
});
