import { apiRequest } from './api-client';
import type { PlayerPosition } from './players-api';
import type { WalletItemType, WalletMatchStatus } from './wallet-api';

export const AUCTION_STATUSES = [
  'WAITING',
  'ACTIVE',
  'LAST_CALL',
  'SOLD',
  'UNSOLD',
  'CANCELLED',
] as const;

export const AUCTION_EVENT_TYPES = [
  'NOMINATED',
  'STARTED',
  'BID_PLACED',
  'LAST_CALL',
  'SOLD',
  'UNSOLD',
  'CANCELLED',
] as const;

export type AuctionStatus = (typeof AUCTION_STATUSES)[number];
export type AuctionEventType = (typeof AUCTION_EVENT_TYPES)[number];

export interface AuctionParticipant {
  id: string;
  userId: string;
  username: string;
  displayName: string;
}

export interface AuctionPlayerClub {
  id: string;
  name: string;
  shortName: string;
}

export interface AuctionPlayer {
  id: string;
  fullName: string;
  shortName: string;
  nationalityCode: string;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number;
  marketValue: number;
  club: AuctionPlayerClub | null;
}

export interface AuctionManager {
  id: string;
  fullName: string;
  nationalityCode: string;
  tacticalStyle: string;
  preferredFormations: string[];
  passingPhilosophy: string;
  defensivePhilosophy: string;
  pressingStyle: string;
  overall: number;
  attacking: number;
  defending: number;
  adaptability: number;
  manManagement: number;
  attackingBonus: number;
  midfieldBonus: number;
  defendingBonus: number;
  chemistryBonus: number;
  marketValue: number;
  tier: 'FREE' | 'PREMIUM';
  club: AuctionPlayerClub | null;
}
export interface AuctionHighestBid {
  id: string;
  participantId: string;
  amount: number;
  sequence: number;
  auctionVersion: number;
  createdAt: string;
  bidder: AuctionParticipant;
}

export interface Auction {
  id: string;
  matchId: string;
  roomCode: string;
  matchStatus: WalletMatchStatus;
  playerId: string | null;
  managerId: string | null;
  type: WalletItemType;
  status: AuctionStatus;
  openingPrice: number;
  currentPrice: number;
  minimumIncrement: number;
  minimumNextBid: number | null;
  version: number;
  startsAt: string | null;
  endsAt: string | null;
  lastCallAt: string | null;
  soldAt: string | null;
  createdAt: string;
  updatedAt: string;
  serverTime: string;
  player: AuctionPlayer | null;
  manager: AuctionManager | null;
  nominatedBy: AuctionParticipant;
  winner: AuctionParticipant | null;
  highestBid: AuctionHighestBid | null;
  bidCount: number;
}

export interface AuctionMutationResult {
  auction: Auction;
  eventType: AuctionEventType;
  replayed: boolean;
}

export interface AuctionEvent {
  id: string;
  auctionId: string;
  participantId: string | null;
  type: AuctionEventType;
  sequence: number;
  auctionVersion: number;
  statusAfter: AuctionStatus;
  amount: number | null;
  payload: unknown;
  createdAt: string;
  participant: AuctionParticipant | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuctionListResponse {
  data: Auction[];
  pagination: Pagination;
}

export interface AuctionHistoryResponse {
  data: AuctionEvent[];
  pagination: Pagination;
  auctionId: string;
}

export interface AuctionListQuery {
  status?: AuctionStatus;
  page?: number;
  pageSize?: number;
}

export interface AuctionHistoryQuery {
  type?: AuctionEventType;
  page?: number;
  pageSize?: number;
}

export interface CreatePlayerAuctionInput {
  playerId: string;
  openingPrice: number;
  minimumIncrement: number;
}

export interface CreateManagerAuctionInput {
  managerId: string;
  openingPrice: number;
  minimumIncrement: number;
}
export interface StartAuctionInput {
  durationSeconds?: number;
}

export interface PlaceAuctionBidInput {
  amount: number;
  idempotencyKey: string;
}

function appendQueryValue(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value === undefined || value === '') {
    return;
  }

  params.set(key, String(value));
}

function pathWithQuery(path: string, values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    appendQueryValue(params, key, value);
  }

  const queryString = params.toString();

  return queryString ? `${path}?${queryString}` : path;
}

function encodedIdentifier(identifier: string): string {
  return encodeURIComponent(identifier.trim());
}

export function buildAuctionPath(auctionId: string): string {
  return `/api/v1/auctions/${encodedIdentifier(auctionId)}`;
}

export function buildMatchAuctionsPath(matchId: string, query: AuctionListQuery = {}): string {
  return pathWithQuery(`/api/v1/matches/${encodedIdentifier(matchId)}/auctions`, {
    status: query.status,
    page: query.page,
    pageSize: query.pageSize,
  });
}

export function buildAuctionHistoryPath(
  auctionId: string,
  query: AuctionHistoryQuery = {},
): string {
  return pathWithQuery(`${buildAuctionPath(auctionId)}/history`, {
    type: query.type,
    page: query.page,
    pageSize: query.pageSize,
  });
}

export function getMatchAuctions(
  matchId: string,
  query: AuctionListQuery = {},
  init: RequestInit = {},
): Promise<AuctionListResponse> {
  return apiRequest<AuctionListResponse>(buildMatchAuctionsPath(matchId, query), init);
}

export function getAuction(auctionId: string, init: RequestInit = {}): Promise<Auction> {
  return apiRequest<Auction>(buildAuctionPath(auctionId), init);
}

export function getAuctionHistory(
  auctionId: string,
  query: AuctionHistoryQuery = {},
  init: RequestInit = {},
): Promise<AuctionHistoryResponse> {
  return apiRequest<AuctionHistoryResponse>(buildAuctionHistoryPath(auctionId, query), init);
}

export function createPlayerAuction(
  matchId: string,
  input: CreatePlayerAuctionInput,
  init: RequestInit = {},
): Promise<AuctionMutationResult> {
  return apiRequest<AuctionMutationResult>(
    `/api/v1/matches/${encodedIdentifier(matchId)}/auctions`,
    {
      ...init,
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function createManagerAuction(
  matchId: string,
  input: CreateManagerAuctionInput,
  init: RequestInit = {},
): Promise<AuctionMutationResult> {
  return apiRequest<AuctionMutationResult>(
    `/api/v1/matches/${encodedIdentifier(matchId)}/manager-auctions`,
    {
      ...init,
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}
export function startAuction(
  auctionId: string,
  input: StartAuctionInput = {},
  init: RequestInit = {},
): Promise<AuctionMutationResult> {
  return apiRequest<AuctionMutationResult>(`${buildAuctionPath(auctionId)}/start`, {
    ...init,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function placeAuctionBid(
  auctionId: string,
  input: PlaceAuctionBidInput,
  init: RequestInit = {},
): Promise<AuctionMutationResult> {
  return apiRequest<AuctionMutationResult>(`${buildAuctionPath(auctionId)}/bids`, {
    ...init,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function cancelAuction(
  auctionId: string,
  init: RequestInit = {},
): Promise<AuctionMutationResult> {
  return apiRequest<AuctionMutationResult>(`${buildAuctionPath(auctionId)}/cancel`, {
    ...init,
    method: 'POST',
  });
}
