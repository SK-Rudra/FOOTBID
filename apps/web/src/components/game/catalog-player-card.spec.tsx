import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CatalogPlayerCard } from './catalog-player-card';
import type { CatalogPlayer } from '@/lib/players-api';

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

describe('CatalogPlayerCard', () => {
  it('links to the profile and presents core scouting data', () => {
    render(<CatalogPlayerCard player={player} />);

    const profileLink = screen.getByRole('link', {
      name: /view milo marin, rw, overall 84/i,
    });

    expect(profileLink).toHaveAttribute('href', '/players/player-1');
    expect(screen.getByText('Milo Marin')).toBeInTheDocument();
    expect(screen.getByText('€29M')).toBeInTheDocument();
    expect(screen.getByText('Harbour Circuit · Test League')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
