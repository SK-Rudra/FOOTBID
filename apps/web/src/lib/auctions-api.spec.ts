import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildAuctionHistoryPath,
  buildAuctionPath,
  buildMatchAuctionsPath,
  cancelAuction,
  createFormationAuction,
  createManagerAuction,
  createPlayerAuction,
  getAuction,
  getAuctionHistory,
  getMatchAuctions,
  placeAuctionBid,
  startAuction,
} from './auctions-api';

const apiRequestMock = vi.hoisted(() => vi.fn());

vi.mock('./api-client', () => ({
  apiRequest: apiRequestMock,
}));

describe('auctions API', () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockResolvedValue({});
  });

  it('builds encoded auction list and history paths', () => {
    expect(buildAuctionPath(' auction/id ')).toBe('/api/v1/auctions/auction%2Fid');

    expect(
      buildMatchAuctionsPath(' match/id ', {
        status: 'ACTIVE',
        page: 2,
        pageSize: 10,
      }),
    ).toBe('/api/v1/matches/match%2Fid/auctions?status=ACTIVE&page=2&pageSize=10');

    expect(
      buildAuctionHistoryPath(' auction/id ', {
        type: 'BID_PLACED',
        page: 1,
        pageSize: 25,
      }),
    ).toBe('/api/v1/auctions/auction%2Fid/history?type=BID_PLACED&page=1&pageSize=25');
  });

  it('requests authenticated auction reads', async () => {
    await getMatchAuctions('match-1', {
      status: 'LAST_CALL',
      page: 1,
    });

    await getAuction('auction/id');

    await getAuctionHistory('auction-1', {
      type: 'SOLD',
      pageSize: 50,
    });

    expect(apiRequestMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/matches/match-1/auctions?status=LAST_CALL&page=1',
      {},
    );

    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/api/v1/auctions/auction%2Fid', {});

    expect(apiRequestMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/auctions/auction-1/history?type=SOLD&pageSize=50',
      {},
    );
  });

  it('creates, starts, bids on, and cancels auctions through POST requests', async () => {
    const nomination = {
      playerId: 'player-1',
      openingPrice: 10_000_000,
      minimumIncrement: 1_000_000,
    };

    const bid = {
      amount: 12_000_000,
      idempotencyKey: 'phase7-web-bid-0001',
    };

    await createPlayerAuction('match/id', nomination);
    await startAuction('auction-1', { durationSeconds: 45 });
    await placeAuctionBid('auction-1', bid);
    await cancelAuction('auction-1');

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/api/v1/matches/match%2Fid/auctions', {
      method: 'POST',
      body: JSON.stringify(nomination),
    });

    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/api/v1/auctions/auction-1/start', {
      method: 'POST',
      body: JSON.stringify({ durationSeconds: 45 }),
    });

    expect(apiRequestMock).toHaveBeenNthCalledWith(3, '/api/v1/auctions/auction-1/bids', {
      method: 'POST',
      body: JSON.stringify(bid),
    });

    expect(apiRequestMock).toHaveBeenNthCalledWith(4, '/api/v1/auctions/auction-1/cancel', {
      method: 'POST',
    });
  });

  it('creates manager auctions through the dedicated endpoint', async () => {
    const nomination = {
      managerId: 'manager-1',
      openingPrice: 12_000_000,
      minimumIncrement: 1_000_000,
    };

    await createManagerAuction('match/id', nomination);

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/matches/match%2Fid/manager-auctions', {
      method: 'POST',
      body: JSON.stringify(nomination),
    });
  });

  it('creates formation auctions through the dedicated endpoint', async () => {
    const nomination = {
      formationId: 'formation-1',
      openingPrice: 10_000_000,
      minimumIncrement: 1_000_000,
    };

    await createFormationAuction('match/id', nomination);

    expect(apiRequestMock).toHaveBeenCalledWith('/api/v1/matches/match%2Fid/formation-auctions', {
      method: 'POST',
      body: JSON.stringify(nomination),
    });
  });
});
