import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerCatalog } from './player-catalog';
import {
  getPlayerFilters,
  getPlayers,
  type CatalogPlayer,
  type PlayerFilters,
} from '@/lib/players-api';

vi.mock('@/lib/players-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/players-api')>();

  return {
    ...actual,
    getPlayerFilters: vi.fn(),
    getPlayers: vi.fn(),
  };
});

const player: CatalogPlayer = {
  id: 'player-1',
  fullName: 'Milo Marin',
  shortName: 'M. Marin',
  nationalityCode: 'PT',
  primaryPosition: 'RW',
  secondaryPositions: ['LW'],
  preferredFoot: 'LEFT',
  overall: 84,
  pace: 91,
  shooting: 82,
  passing: 80,
  dribbling: 89,
  defending: 38,
  physical: 67,
  goalkeeping: 7,
  marketValue: 29_000_000,
  image: null,
  club: {
    id: 'club-1',
    name: 'Harbour Circuit',
    shortName: 'HBC',
    countryCode: 'BD',
  },
  league: {
    id: 'league-1',
    name: 'Test League',
    slug: 'test-league',
    countryCode: 'BD',
  },
};

const filters: PlayerFilters = {
  positions: ['RW', 'LW'],
  leagues: [player.league!],
  clubs: [
    {
      ...player.club!,
      leagueId: 'league-1',
    },
  ],
  nationalities: ['PT'],
};

describe('PlayerCatalog', () => {
  beforeEach(() => {
    vi.mocked(getPlayerFilters).mockReset();
    vi.mocked(getPlayers).mockReset();

    vi.mocked(getPlayerFilters).mockResolvedValue(filters);
    vi.mocked(getPlayers).mockResolvedValue({
      data: [player],
      pagination: {
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('loads players and applies a scouting search', async () => {
    const user = userEvent.setup();

    render(<PlayerCatalog />);

    expect(
      await screen.findByRole('link', {
        name: /view milo marin/i,
      }),
    ).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Player, club or league'), 'Milo');

    await user.click(
      screen.getByRole('button', {
        name: 'Apply',
      }),
    );

    await waitFor(() => {
      expect(getPlayers).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: 'Milo',
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

  it('requests the next result page', async () => {
    const user = userEvent.setup();

    vi.mocked(getPlayers).mockResolvedValue({
      data: [player],
      pagination: {
        page: 1,
        pageSize: 12,
        total: 13,
        totalPages: 2,
      },
    });

    render(<PlayerCatalog />);

    const nextButton = await screen.findByRole('button', {
      name: 'Next',
    });

    await user.click(nextButton);

    await waitFor(() => {
      expect(getPlayers).toHaveBeenLastCalledWith(
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
