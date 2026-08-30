import { io, type Socket } from 'socket.io-client';
import type {
  Auction,
  AuctionListResponse,
  AuctionMutationResult,
  PlaceAuctionBidInput,
} from './auctions-api';
import { API_BASE_URL } from './api-client';

export interface AuctionSocketReady {
  userId: string;
  serverTime: string;
}

export interface AuctionSocketError {
  status?: string;
  statusCode?: number;
  message?:
    | string
    | {
        statusCode?: number;
        message?: string;
      };
  retryAfterMs?: number;
  cause?: unknown;
}

export interface AuctionJoinAcknowledgement {
  joined: boolean;
  auction: Auction;
}

export interface AuctionLeaveAcknowledgement {
  left: boolean;
  auctionId: string;
}

export interface MatchJoinAcknowledgement {
  joined: boolean;
  matchId: string;
  auctions: AuctionListResponse;
}

export interface MatchLeaveAcknowledgement {
  left: boolean;
  matchId: string;
}

interface ServerToClientEvents {
  'auction:ready': (payload: AuctionSocketReady) => void;
  'auction:updated': (payload: AuctionMutationResult) => void;
  'auction:error': (payload: AuctionSocketError) => void;
  exception: (payload: AuctionSocketError) => void;
}

interface ClientToServerEvents {
  'auction:join': (
    payload: { auctionId: string },
    acknowledgement: (response: AuctionJoinAcknowledgement) => void,
  ) => void;

  'auction:leave': (
    payload: { auctionId: string },
    acknowledgement: (response: AuctionLeaveAcknowledgement) => void,
  ) => void;

  'match:join': (
    payload: { matchId: string },
    acknowledgement: (response: MatchJoinAcknowledgement) => void,
  ) => void;

  'match:leave': (
    payload: { matchId: string },
    acknowledgement: (response: MatchLeaveAcknowledgement) => void,
  ) => void;

  'auction:bid': (
    payload: PlaceAuctionBidInput & { auctionId: string },
    acknowledgement: (response: AuctionMutationResult) => void,
  ) => void;
}

export type AuctionSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function createAuctionSocket(): AuctionSocket {
  return io(`${API_BASE_URL}/auctions`, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    withCredentials: true,
  });
}

export function auctionSocketErrorStatus(payload: AuctionSocketError): number | undefined {
  if (typeof payload.statusCode === 'number') {
    return payload.statusCode;
  }

  if (
    typeof payload.message === 'object' &&
    payload.message !== null &&
    typeof payload.message.statusCode === 'number'
  ) {
    return payload.message.statusCode;
  }

  return undefined;
}

export function auctionSocketErrorMessage(payload: AuctionSocketError): string {
  if (typeof payload.message === 'string') {
    return payload.message;
  }

  if (
    typeof payload.message === 'object' &&
    payload.message !== null &&
    typeof payload.message.message === 'string'
  ) {
    return payload.message.message;
  }

  return 'The real-time auction request could not be completed.';
}
