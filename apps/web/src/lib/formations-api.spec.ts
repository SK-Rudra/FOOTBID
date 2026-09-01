import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildFormationCatalogPath,
  getFormation,
  getFormationFilters,
  getFormations,
} from './formations-api';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('./api-client', () => ({
  apiRequest: apiRequestMock,
}));

describe('formations API', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({});
  });

  it('builds a normalized formation catalogue query', async () => {
    const path = buildFormationCatalogPath({
      search: '  attacking shape  ',
      buildUpStyle: 'Fast Build Up',
      attackingStyle: 'Wide',
      defensiveStyle: 'Front Foot',
      tier: 'PREMIUM',
      minMarketValue: 5_000_000,
      maxMarketValue: 12_000_000,
      sortBy: 'marketValue',
      sortOrder: 'desc',
      page: 2,
      pageSize: 12,
    });

    expect(path).toBe(
      '/api/v1/formations?search=attacking+shape&buildUpStyle=Fast+Build+Up&attackingStyle=Wide&defensiveStyle=Front+Foot&tier=PREMIUM&minMarketValue=5000000&maxMarketValue=12000000&sortBy=marketValue&sortOrder=desc&page=2&pageSize=12',
    );

    await getFormations({
      search: '4-3-3',
      page: 1,
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/formations?search=4-3-3&page=1', {});
  });

  it('requests filters and safely encodes formation identifiers', async () => {
    await getFormationFilters();
    await getFormation('formation/id');

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/api/v1/formations/filters', {});

    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/api/v1/formations/formation%2Fid', {});
  });
});
