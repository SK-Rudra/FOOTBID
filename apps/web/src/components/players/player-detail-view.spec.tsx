import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerDetailView } from './player-detail-view';
import { getPlayer, type PlayerDetail } from '@/lib/players-api';

vi.mock('@/lib/players-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/players-api')>();

  return {
    ...actual,
    getPlayer: vi.fn(),
  };
});

const player: PlayerDetail = {
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
  dateOfBirth: '2000-04-12T00:00:00.000Z',
  dataVersion: '1.0.0',
  updatedAt: '2026-08-29T12:00:00.000Z',
};

describe('PlayerDetailView', () => {
  beforeEach(() => {
    vi.mocked(getPlayer).mockReset();
    vi.mocked(getPlayer).mockResolvedValue(player);
  });

  it('loads the complete player profile without an official photograph', async () => {
    render(<PlayerDetailView playerId="player-1" />);

    expect(
      await screen.findByRole('heading', {
        name: 'Milo Marin',
      }),
    ).toBeInTheDocument();

    expect(getPlayer).toHaveBeenCalledWith(
      'player-1',
      expect.objectContaining({
        signal: expect.anything(),
      }),
    );

    expect(screen.getByText('12 April 2000')).toBeInTheDocument();
    expect(screen.getByText('€29M')).toBeInTheDocument();
    expect(screen.getByText(/official photographs, club logos/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
