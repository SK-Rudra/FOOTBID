import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  auctionSocketErrorMessage,
  auctionSocketErrorStatus,
  createAuctionSocket,
} from './auction-socket';

const ioMock = vi.hoisted(() => vi.fn());

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

vi.mock('./api-client', () => ({
  API_BASE_URL: 'https://api.footbid.test',
}));

describe('auction Socket.IO client', () => {
  beforeEach(() => {
    ioMock.mockReset();
  });

  it('creates a credentialed auction socket without connecting immediately', () => {
    const socket = {
      connect: vi.fn(),
    };

    ioMock.mockReturnValue(socket);

    expect(createAuctionSocket()).toBe(socket);

    expect(ioMock).toHaveBeenCalledWith('https://api.footbid.test/auctions', {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    expect(socket.connect).not.toHaveBeenCalled();
  });

  it('normalizes direct and nested WebSocket errors', () => {
    expect(
      auctionSocketErrorStatus({
        statusCode: 429,
        message: 'Too many bids.',
      }),
    ).toBe(429);

    expect(
      auctionSocketErrorStatus({
        message: {
          statusCode: 401,
          message: 'Authentication required.',
        },
      }),
    ).toBe(401);

    expect(
      auctionSocketErrorMessage({
        statusCode: 429,
        message: 'Too many bids.',
      }),
    ).toBe('Too many bids.');

    expect(
      auctionSocketErrorMessage({
        message: {
          statusCode: 401,
          message: 'Authentication required.',
        },
      }),
    ).toBe('Authentication required.');

    expect(auctionSocketErrorMessage({})).toBe(
      'The real-time auction request could not be completed.',
    );
  });
});
