import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogFormation } from '@/lib/formations-api';
import type { SaveSquadPlayerInput, SquadInventoryPlayer } from '@/lib/squads-api';
import { SquadPitch } from './squad-pitch';

const formation: Pick<CatalogFormation, 'code' | 'shape'> = {
  code: '4-4-2',
  shape: {
    version: 1,
    slots: [
      {
        slot: 1,
        position: 'GK',
        x: 50,
        y: 90,
      },
      {
        slot: 10,
        position: 'ST',
        x: 38,
        y: 22,
      },
    ],
  },
};

const goalkeeper: SquadInventoryPlayer = {
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

describe('SquadPitch', () => {
  it('places the selected player into a formation slot', () => {
    const onAssign = vi.fn();

    render(
      <SquadPitch
        formation={formation}
        players={[goalkeeper]}
        assignments={[]}
        selectedPlayerId={goalkeeper.id}
        onAssign={onAssign}
        onSelectPlayer={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'GK slot 1',
      }),
    );

    expect(onAssign).toHaveBeenCalledWith(goalkeeper.id, 1);
  });

  it('selects an assigned player for movement', () => {
    const onSelectPlayer = vi.fn();

    const assignments: SaveSquadPlayerInput[] = [
      {
        playerId: goalkeeper.id,
        slot: 1,
        role: 'STARTER',
        isCaptain: true,
      },
    ];

    render(
      <SquadPitch
        formation={formation}
        players={[goalkeeper]}
        assignments={assignments}
        selectedPlayerId={null}
        onAssign={vi.fn()}
        onSelectPlayer={onSelectPlayer}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'K. Karim, GK, slot 1',
      }),
    );

    expect(onSelectPlayer).toHaveBeenCalledWith(goalkeeper.id);
    expect(screen.getByLabelText('Captain')).toBeInTheDocument();
  });
});
