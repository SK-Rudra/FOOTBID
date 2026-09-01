import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getManagerFilters,
  getManagers,
  type CatalogManager,
  type ManagerFilters,
} from '@/lib/managers-api';
import { ManagerCatalog } from './manager-catalog';

vi.mock('@/lib/managers-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/managers-api')>();

  return {
    ...actual,
    getManagerFilters: vi.fn(),
    getManagers: vi.fn(),
  };
});

const manager: CatalogManager = {
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
  tier: 'PREMIUM',
  image: null,
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

const filters: ManagerFilters = {
  leagues: [manager.league!],
  clubs: [
    {
      ...manager.club!,
      leagueId: manager.league!.id,
    },
  ],
  nationalities: ['BD'],
  tacticalStyles: ['High Press'],
  preferredFormations: ['4-3-3', '4-4-2'],
  passingPhilosophies: ['Short Passing'],
  defensivePhilosophies: ['Front Foot'],
  pressingStyles: ['High Press'],
};

describe('ManagerCatalog', () => {
  beforeEach(() => {
    vi.mocked(getManagerFilters).mockReset();
    vi.mocked(getManagers).mockReset();

    vi.mocked(getManagerFilters).mockResolvedValue(filters);
    vi.mocked(getManagers).mockResolvedValue({
      data: [manager],
      pagination: {
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('loads managers and applies a tactical search', async () => {
    const user = userEvent.setup();

    render(<ManagerCatalog />);

    expect(await screen.findByText('Nayeem Rahman')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Manager, club, or style'), 'Nayeem');

    await user.click(
      screen.getByRole('button', {
        name: 'Apply',
      }),
    );

    await waitFor(() => {
      expect(getManagers).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'Nayeem',
          sortBy: 'overall',
          sortOrder: 'desc',
          page: 1,
          pageSize: 12,
        }),
        expect.objectContaining({
          signal: expect.anything(),
        }),
      );
    });
  });

  it('requests the next manager result page', async () => {
    const user = userEvent.setup();

    vi.mocked(getManagers).mockResolvedValue({
      data: [manager],
      pagination: {
        page: 1,
        pageSize: 12,
        total: 13,
        totalPages: 2,
      },
    });

    render(<ManagerCatalog />);

    const nextButton = await screen.findByRole('button', {
      name: 'Next',
    });

    await user.click(nextButton);

    await waitFor(() => {
      expect(getManagers).toHaveBeenLastCalledWith(
        expect.objectContaining({
          page: 2,
        }),
        expect.objectContaining({
          signal: expect.anything(),
        }),
      );
    });
  });
});
