import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSquad, lockSquad, saveSquad, startSquadBuilding } from './squads-api';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('./api-client', () => ({
  apiRequest: apiRequestMock,
}));

describe('squads API', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({});
  });

  it('requests the authenticated private squad', async () => {
    await getSquad(' match/id ');

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/matches/match%2Fid/squad', {});
  });

  it('saves a complete versioned squad snapshot', async () => {
    const input = {
      version: 3,
      name: 'Comets XI',
      formationId: 'formation-1',
      managerId: 'manager-1',
      players: [
        {
          playerId: 'player-1',
          slot: 1,
          role: 'STARTER' as const,
          isCaptain: true,
        },
      ],
    };

    await saveSquad('match-1', input);

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/matches/match-1/squad', {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  });

  it('locks a squad using its current version', async () => {
    await lockSquad('match-1', {
      version: 4,
    });

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/matches/match-1/squad/lock', {
      method: 'POST',
      body: JSON.stringify({
        version: 4,
      }),
    });
  });

  it('starts squad building through the host endpoint', async () => {
    await startSquadBuilding('match/id');

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/matches/match%2Fid/squad-building/start', {
      method: 'POST',
    });
  });
});
