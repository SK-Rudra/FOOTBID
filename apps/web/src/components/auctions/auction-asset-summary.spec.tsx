import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Auction } from '@/lib/auctions-api';
import { AuctionAssetSummary } from './auction-room-view';

const managerAuction: Auction = {
  id: 'auction-1',
  matchId: 'match-1',
  roomCode: 'ROOM01',
  matchStatus: 'AUCTION',
  playerId: null,
  managerId: 'manager-1',
  type: 'MANAGER',
  status: 'WAITING',
  openingPrice: 12_000_000,
  currentPrice: 12_000_000,
  minimumIncrement: 1_000_000,
  minimumNextBid: 12_000_000,
  version: 0,
  startsAt: null,
  endsAt: null,
  lastCallAt: null,
  soldAt: null,
  createdAt: '2026-08-31T15:00:00.000Z',
  updatedAt: '2026-08-31T15:00:00.000Z',
  serverTime: '2026-08-31T15:00:00.000Z',
  player: null,
  manager: {
    id: 'manager-1',
    fullName: 'Nayeem Rahman',
    nationalityCode: 'BD',
    tacticalStyle: 'High Press',
    preferredFormations: ['4-3-3-attack', '4-4-2'],
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
    club: {
      id: 'club-1',
      name: 'Dhaka Comets',
      shortName: 'COMETS',
    },
  },
  nominatedBy: {
    id: 'participant-1',
    userId: 'host-1',
    username: 'host',
    displayName: 'Match Host',
  },
  winner: null,
  highestBid: null,
  bidCount: 0,
};

describe('AuctionAssetSummary', () => {
  it('renders manager tactics, ratings, and bonuses', () => {
    render(<AuctionAssetSummary auction={managerAuction} />);

    expect(
      screen.getByRole('heading', {
        name: 'Nayeem Rahman',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('Short Passing')).toBeInTheDocument();
    expect(screen.getByText('Front Foot')).toBeInTheDocument();
    expect(screen.getByText('4-3-3-attack')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
  });
});
