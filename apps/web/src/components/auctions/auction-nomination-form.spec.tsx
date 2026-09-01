import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuctionNominationForm } from './auction-nomination-form';
import { createFormationAuction, type AuctionMutationResult } from '@/lib/auctions-api';
import { getFormations, type CatalogFormation } from '@/lib/formations-api';
import { getManagers } from '@/lib/managers-api';
import { getPlayers } from '@/lib/players-api';

const showToastMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: showToastMock,
  }),
}));

vi.mock('@/lib/auctions-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auctions-api')>();

  return {
    ...actual,
    createFormationAuction: vi.fn(),
    createManagerAuction: vi.fn(),
    createPlayerAuction: vi.fn(),
  };
});

vi.mock('@/lib/formations-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/formations-api')>();

  return {
    ...actual,
    getFormations: vi.fn(),
  };
});

vi.mock('@/lib/managers-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/managers-api')>();

  return {
    ...actual,
    getManagers: vi.fn(),
  };
});

vi.mock('@/lib/players-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/players-api')>();

  return {
    ...actual,
    getPlayers: vi.fn(),
  };
});

const auctionableFormation: CatalogFormation = {
  id: 'formation-1',
  code: '4-3-3',
  name: 'Attacking 4-3-3',
  description: 'Wide attacking shape.',
  shape: {
    version: 1,
    slots: [],
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
};

const neutralFormation: CatalogFormation = {
  ...auctionableFormation,
  id: 'formation-basic',
  code: '4-4-2-basic',
  name: 'Basic 4-4-2',
  marketValue: 0,
  tier: 'FREE',
  isNeutral: true,
};

describe('AuctionNominationForm', () => {
  beforeEach(() => {
    showToastMock.mockReset();
    vi.mocked(createFormationAuction).mockReset();
    vi.mocked(getFormations).mockReset();
    vi.mocked(getManagers).mockReset();
    vi.mocked(getPlayers).mockReset();

    vi.mocked(getPlayers).mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
      },
    });

    vi.mocked(getManagers).mockResolvedValue({
      data: [],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 0,
        totalPages: 0,
      },
    });

    vi.mocked(getFormations).mockResolvedValue({
      data: [neutralFormation, auctionableFormation],
      pagination: {
        page: 1,
        pageSize: 50,
        total: 2,
        totalPages: 1,
      },
    });

    vi.mocked(createFormationAuction).mockResolvedValue({
      eventType: 'NOMINATED',
      replayed: false,
      auction: {
        player: null,
        manager: null,
        formation: auctionableFormation,
      },
    } as AuctionMutationResult);
  });

  it('excludes the neutral fallback and nominates an auctionable formation', async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    render(<AuctionNominationForm matchId="match-1" onCreated={onCreated} />);

    await waitFor(() => {
      expect(
        screen.queryByRole('option', {
          name: 'Loading assets...',
        }),
      ).not.toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', {
        name: 'Formations',
      }),
    );

    expect(
      await screen.findByRole('option', {
        name: /Attacking 4-3-3/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole('option', {
        name: /Basic 4-4-2/,
      }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Nominate formation',
      }),
    );

    await waitFor(() => {
      expect(createFormationAuction).toHaveBeenCalledWith('match-1', {
        formationId: 'formation-1',
        openingPrice: 10_000_000,
        minimumIncrement: 1_000_000,
      });
    });

    expect(onCreated).toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Formation nominated',
        tone: 'success',
      }),
    );
  });
});
