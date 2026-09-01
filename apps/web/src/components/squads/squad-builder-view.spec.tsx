import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import type {
  Squad,
  SquadFormationOption,
  SquadInventoryPlayer,
  SquadManagerOption,
  SquadResponse,
} from '@/lib/squads-api';
import { SquadBuilderView } from './squad-builder-view';

const mocks = vi.hoisted(() => {
  const replace = vi.fn();

  return {
    replace,
    router: {
      replace,
    },
    getCurrentUser: vi.fn(),
    getWallet: vi.fn(),
    getSquad: vi.fn(),
    saveSquad: vi.fn(),
    lockSquad: vi.fn(),
    startSquadBuilding: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/squad',
  useRouter: () => mocks.router,
}));

vi.mock('@/lib/api-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-client')>();

  return {
    ...actual,
    getCurrentUser: mocks.getCurrentUser,
  };
});

vi.mock('@/lib/wallet-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wallet-api')>();

  return {
    ...actual,
    getWallet: mocks.getWallet,
  };
});

vi.mock('@/lib/squads-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/squads-api')>();

  return {
    ...actual,
    getSquad: mocks.getSquad,
    saveSquad: mocks.saveSquad,
    lockSquad: mocks.lockSquad,
    startSquadBuilding: mocks.startSquadBuilding,
  };
});

const formation: SquadFormationOption = {
  id: 'formation-1',
  code: '4-4-2',
  name: 'Balanced 4-4-2',
  description: 'A balanced formation.',
  shape: {
    version: 1,
    slots: [
      { slot: 1, position: 'GK', x: 50, y: 90 },
      { slot: 2, position: 'LB', x: 15, y: 72 },
      { slot: 3, position: 'CB', x: 38, y: 75 },
      { slot: 4, position: 'CB', x: 62, y: 75 },
      { slot: 5, position: 'RB', x: 85, y: 72 },
      { slot: 6, position: 'LM', x: 15, y: 48 },
      { slot: 7, position: 'CM', x: 40, y: 52 },
      { slot: 8, position: 'CM', x: 60, y: 52 },
      { slot: 9, position: 'RM', x: 85, y: 48 },
      { slot: 10, position: 'ST', x: 38, y: 22 },
      { slot: 11, position: 'ST', x: 62, y: 22 },
    ],
  },
  buildUpStyle: 'Balanced',
  attackingStyle: 'Balanced',
  defensiveStyle: 'Balanced',
  width: 50,
  tempo: 50,
  pressingIntensity: 50,
  attackingBonus: 0,
  midfieldBonus: 0,
  defendingBonus: 0,
  chemistryBonus: 0,
  marketValue: 0,
  tier: 'FREE',
  isNeutral: true,
  access: 'NEUTRAL',
  acquisitionPrice: null,
};

const manager: SquadManagerOption = {
  id: 'manager-1',
  fullName: 'KickoffBid Neutral Coach',
  nationalityCode: 'BD',
  tacticalStyle: 'Balanced',
  preferredFormations: ['4-4-2'],
  passingPhilosophy: 'Balanced',
  defensivePhilosophy: 'Balanced',
  pressingStyle: 'Balanced',
  overall: 65,
  attacking: 65,
  defending: 65,
  adaptability: 65,
  manManagement: 65,
  attackingBonus: 0,
  midfieldBonus: 0,
  defendingBonus: 0,
  chemistryBonus: 0,
  marketValue: 0,
  tier: 'FREE',
  isNeutral: true,
  access: 'NEUTRAL',
  acquisitionPrice: null,
};

const player: SquadInventoryPlayer = {
  id: 'player-1',
  ownershipId: 'ownership-1',
  fullName: 'Karim Goalkeeper',
  shortName: 'K. Karim',
  nationalityCode: 'BD',
  primaryPosition: 'GK',
  secondaryPositions: [],
  overall: 81,
  pace: 42,
  shooting: 18,
  passing: 61,
  dribbling: 45,
  defending: 24,
  physical: 72,
  goalkeeping: 84,
  marketValue: 8_000_000,
  acquisitionPrice: 7_500_000,
  acquiredAt: '2026-09-01T08:00:00.000Z',
  club: {
    id: 'club-1',
    name: 'Dhaka Comets',
    shortName: 'COMETS',
  },
};

const editableResponse: SquadResponse = {
  match: {
    id: 'match-1',
    roomCode: 'ROOM01',
    status: 'SQUAD_BUILDING',
    isHost: true,
    opponentLocked: false,
  },
  participant: {
    id: 'participant-1',
    userId: 'user-1',
    side: 'PLAYER_ONE',
    status: 'CONNECTED',
  },
  canEdit: true,
  squad: null,
  inventory: {
    players: [player],
    managers: [manager],
    formations: [formation],
  },
};

const savedSquad: Squad = {
  id: 'squad-1',
  participantId: 'participant-1',
  formationId: formation.id,
  managerId: manager.id,
  name: 'Final XI',
  chemistry: 0,
  overallRating: 0,
  version: 1,
  isLocked: false,
  lockedAt: null,
  createdAt: '2026-09-01T09:00:00.000Z',
  updatedAt: '2026-09-01T09:00:00.000Z',
  formation,
  manager,
  players: [],
  ratings: {
    attack: 0,
    midfield: 0,
    defense: 0,
    goalkeeper: 0,
    overall: 0,
    chemistry: 0,
    squadPower: 0,
  },
};

function renderBuilder() {
  return render(
    <ToastProvider>
      <SquadBuilderView />
    </ToastProvider>,
  );
}

describe('SquadBuilderView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getCurrentUser.mockResolvedValue({
      id: 'user-1',
      username: 'host',
      displayName: 'Match Host',
      email: 'host@kickoffbid.test',
      role: 'USER',
    });

    mocks.getWallet.mockResolvedValue({
      participantId: 'participant-1',
      matchId: 'match-1',
      roomCode: 'ROOM01',
      matchStatus: 'SQUAD_BUILDING',
      isHost: true,
    });

    mocks.getSquad.mockResolvedValue(editableResponse);
    mocks.saveSquad.mockResolvedValue(savedSquad);
    mocks.lockSquad.mockResolvedValue({
      matchStatus: 'SQUAD_BUILDING',
      replayed: false,
      squad: {
        ...savedSquad,
        isLocked: true,
        lockedAt: '2026-09-01T09:15:00.000Z',
      },
    });
    mocks.startSquadBuilding.mockResolvedValue({
      matchId: 'match-1',
      status: 'SQUAD_BUILDING',
      started: true,
    });
  });

  it('loads private inventory and saves a squad draft', async () => {
    const user = userEvent.setup();

    renderBuilder();

    expect(
      await screen.findByRole('heading', {
        name: 'Squad builder',
      }),
    ).toBeInTheDocument();

    expect(screen.getByText('K. Karim')).toBeInTheDocument();
    expect(screen.getByLabelText('4-4-2 interactive squad pitch')).toBeInTheDocument();

    const squadName = screen.getByLabelText('Squad name');

    await user.clear(squadName);
    await user.type(squadName, 'Final XI');
    await user.click(
      screen.getByRole('button', {
        name: 'Save draft',
      }),
    );

    await waitFor(() => {
      expect(mocks.saveSquad).toHaveBeenCalledWith('match-1', {
        version: 0,
        name: 'Final XI',
        formationId: formation.id,
        managerId: manager.id,
        players: [],
      });
    });

    expect(await screen.findByText('Squad draft saved')).toBeInTheDocument();
  });

  it('allows the host to start squad building after auctions', async () => {
    const user = userEvent.setup();

    const auctionResponse: SquadResponse = {
      ...editableResponse,
      match: {
        ...editableResponse.match,
        status: 'AUCTION',
      },
      canEdit: false,
    };

    mocks.getSquad.mockResolvedValueOnce(auctionResponse).mockResolvedValueOnce(editableResponse);

    renderBuilder();

    const startButton = await screen.findByRole('button', {
      name: 'Start squad building',
    });

    await user.click(startButton);

    await waitFor(() => {
      expect(mocks.startSquadBuilding).toHaveBeenCalledWith('match-1');
      expect(mocks.getSquad).toHaveBeenCalledTimes(2);
    });

    expect(await screen.findByText('Squad building started')).toBeInTheDocument();
  });
});
