import { apiRequest } from './api-client';

export const MATCH_STATUSES = [
  'WAITING',
  'AUCTION',
  'SQUAD_BUILDING',
  'READY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

export type MatchStatus = (typeof MATCH_STATUSES)[number];

export type ParticipantSide = 'PLAYER_ONE' | 'PLAYER_TWO';

export type ParticipantStatus = 'CONNECTED' | 'READY' | 'DISCONNECTED' | 'LEFT';

export interface MatchLobbyParticipant {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  side: ParticipantSide;
  status: ParticipantStatus;
  joinedAt: string;
  isHost: boolean;
}

export interface MatchLobby {
  id: string;
  roomCode: string;
  status: MatchStatus;
  budgetPerParticipant: number;
  isHost: boolean;
  isFull: boolean;
  availableSlots: number;
  createdAt: string;
  updatedAt: string;
  participants: MatchLobbyParticipant[];
}

export interface JoinMatchInput {
  roomCode: string;
}

interface CurrentMatchResponse {
  match: MatchLobby | null;
}

export async function getCurrentMatch(init: RequestInit = {}): Promise<MatchLobby | null> {
  const response = await apiRequest<CurrentMatchResponse>('/api/v1/matches/current', init);

  return response.match;
}

export function getMatch(matchId: string, init: RequestInit = {}): Promise<MatchLobby> {
  return apiRequest<MatchLobby>(`/api/v1/matches/${encodeURIComponent(matchId)}`, init);
}

export function createMatch(init: RequestInit = {}): Promise<MatchLobby> {
  return apiRequest<MatchLobby>('/api/v1/matches', {
    ...init,
    method: 'POST',
  });
}

export function joinMatch(input: JoinMatchInput, init: RequestInit = {}): Promise<MatchLobby> {
  return apiRequest<MatchLobby>('/api/v1/matches/join', {
    ...init,
    method: 'POST',
    body: JSON.stringify(input),
  });
}
