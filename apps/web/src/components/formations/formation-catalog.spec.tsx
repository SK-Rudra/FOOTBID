import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FormationCatalog } from './formation-catalog';
import {
  getFormationFilters,
  getFormations,
  type CatalogFormation,
  type FormationFilters,
} from '@/lib/formations-api';

vi.mock('@/lib/formations-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/formations-api')>();

  return {
    ...actual,
    getFormationFilters: vi.fn(),
    getFormations: vi.fn(),
  };
});

const formation: CatalogFormation = {
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
};

const filters: FormationFilters = {
  buildUpStyles: ['Balanced', 'Fast Build Up'],
  attackingStyles: ['Balanced', 'Wide'],
  defensiveStyles: ['Balanced', 'Front Foot'],
  tiers: ['FREE', 'PREMIUM'],
  marketValueRange: {
    min: 0,
    max: 10_000_000,
  },
};

describe('FormationCatalog', () => {
  beforeEach(() => {
    vi.mocked(getFormationFilters).mockReset();
    vi.mocked(getFormations).mockReset();

    vi.mocked(getFormationFilters).mockResolvedValue(filters);
    vi.mocked(getFormations).mockResolvedValue({
      data: [formation],
      pagination: {
        page: 1,
        pageSize: 12,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('loads formations, renders the pitch, and applies a tactical search', async () => {
    const user = userEvent.setup();

    render(<FormationCatalog />);

    expect(
      await screen.findByRole('heading', {
        name: 'Attacking 4-3-3',
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('img', {
        name: '4-3-3 formation shape',
      }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText('Slot 1: GK')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Name, code, or tactical style'), '4-3-3');

    await user.click(
      screen.getByRole('button', {
        name: 'Apply',
      }),
    );

    await waitFor(() => {
      expect(getFormations).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: '4-3-3',
          sortBy: 'name',
          sortOrder: 'asc',
          page: 1,
          pageSize: 12,
        }),
        expect.objectContaining({
          signal: expect.anything(),
        }),
      );
    });
  });

  it('requests the next formation results page', async () => {
    const user = userEvent.setup();

    vi.mocked(getFormations).mockResolvedValue({
      data: [formation],
      pagination: {
        page: 1,
        pageSize: 12,
        total: 13,
        totalPages: 2,
      },
    });

    render(<FormationCatalog />);

    const nextButton = await screen.findByRole('button', {
      name: 'Next',
    });

    await user.click(nextButton);

    await waitFor(() => {
      expect(getFormations).toHaveBeenLastCalledWith(
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
