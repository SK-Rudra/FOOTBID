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
  formationId: null,
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
    club: {
      id: 'club-1',
      name: 'Dhaka Comets',
      shortName: 'COMETS',
    },
  },
  formation: null,
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

const formationAuction: Auction = {
  ...managerAuction,
  id: 'auction-formation',
  playerId: null,
  managerId: null,
  formationId: 'formation-1',
  type: 'FORMATION',
  openingPrice: 10_000_000,
  currentPrice: 10_000_000,
  minimumNextBid: 10_000_000,
  manager: null,
  formation: {
    id: 'formation-1',
    code: '4-3-3',
    name: 'Attacking 4-3-3',
    description: 'Wide attacking shape with coordinated pressing.',
    shape: {
      version: 1,
      slots: [
        { slot: 1, position: 'GK', x: 50, y: 90 },
        { slot: 2, position: 'LB', x: 15, y: 72 },
        { slot: 3, position: 'CB', x: 38, y: 75 },
        { slot: 4, position: 'CB', x: 62, y: 75 },
        { slot: 5, position: 'RB', x: 85, y: 72 },
        { slot: 6, position: 'CM', x: 35, y: 53 },
        { slot: 7, position: 'CM', x: 65, y: 53 },
        { slot: 8, position: 'CAM', x: 50, y: 42 },
        { slot: 9, position: 'LW', x: 20, y: 22 },
        { slot: 10, position: 'ST', x: 50, y: 18 },
        { slot: 11, position: 'RW', x: 80, y: 22 },
      ],
    },
    buildUpStyle: 'Fast Build Up',
    attackingStyle: 'Wide',
    defensiveStyle: 'Front Foot',
    width: 68,
    tempo: 72,
    pressingIntensity: 70,
    attackingBonus: 2,
    midfieldBonus: 1,
    defendingBonus: 0,
    chemistryBonus: 1,
    marketValue: 10_000_000,
    tier: 'PREMIUM',
    isNeutral: false,
  },
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
    expect(screen.getByText('4-3-3')).toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('84')).toBeInTheDocument();
  });

  it('renders a formation pitch, styles, and bonuses', () => {
    render(<AuctionAssetSummary auction={formationAuction} />);

    expect(
      screen.getByRole('heading', {
        name: 'Attacking 4-3-3',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('img', {
        name: '4-3-3 formation shape',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('Fast Build Up')).toBeInTheDocument();
    expect(screen.getByText('Wide')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
