import { apiRequest } from './api-client';
import type { CatalogFormation } from './formations-api';
import type { PlayerPosition } from './players-api';
import type { WalletMatchStatus } from './wallet-api';

export type SquadRole = 'STARTER' | 'SUBSTITUTE' | 'RESERVE';
export type SquadAccess = 'NEUTRAL' | 'OWNED';
export type SquadParticipantSide = 'PLAYER_ONE' | 'PLAYER_TWO';
export type SquadParticipantStatus = 'CONNECTED' | 'READY' | 'DISCONNECTED' | 'LEFT';

export interface SquadPlayerClub {
  id: string;
  name: string;
  shortName: string;
}

export interface SquadPlayer {
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
  club: SquadPlayerClub | null;
}

export interface SquadInventoryPlayer extends SquadPlayer {
  ownershipId: string;
  acquisitionPrice: number;
  acquiredAt: string;
}

export interface SquadManager {
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
  isNeutral: boolean;
}

export interface SquadManagerOption extends SquadManager {
  access: SquadAccess;
  acquisitionPrice: number | null;
}

export interface SquadFormationOption extends CatalogFormation {
  access: SquadAccess;
  acquisitionPrice: number | null;
}

export interface SquadPlayerAssignment {
  id: string;
  playerId: string;
  slot: number;
  role: SquadRole;
  isCaptain: boolean;
  assignedPosition: PlayerPosition;
  acquisitionPrice: number;
  player: SquadPlayer;
}

export interface SquadRatings {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  overall: number;
  chemistry: number;
  squadPower: number;
}

export interface Squad {
  id: string;
  participantId: string;
  formationId: string;
  managerId: string;
  name: string;
  chemistry: number;
  overallRating: number;
  version: number;
  isLocked: boolean;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
  formation: CatalogFormation;
  manager: SquadManager;
  players: SquadPlayerAssignment[];
  ratings: SquadRatings;
}

export interface SquadResponse {
  match: {
    id: string;
    roomCode: string;
    status: WalletMatchStatus;
    isHost: boolean;
    opponentLocked: boolean;
  };
  participant: {
    id: string;
    userId: string;
    side: SquadParticipantSide;
    status: SquadParticipantStatus;
  };
  canEdit: boolean;
  squad: Squad | null;
  inventory: {
    players: SquadInventoryPlayer[];
    managers: SquadManagerOption[];
    formations: SquadFormationOption[];
  };
}

export interface SaveSquadPlayerInput {
  playerId: string;
  slot: number;
  role: SquadRole;
  isCaptain: boolean;
}

export interface SaveSquadInput {
  version: number;
  name: string;
  formationId: string;
  managerId: string;
  players: SaveSquadPlayerInput[];
}

export interface LockSquadInput {
  version: number;
}

export interface LockSquadResult {
  matchStatus: WalletMatchStatus;
  replayed: boolean;
  squad: Squad;
}

export interface StartSquadBuildingResult {
  matchId: string;
  status: 'SQUAD_BUILDING';
  started: boolean;
}

function encodedIdentifier(identifier: string): string {
  return encodeURIComponent(identifier.trim());
}

function buildMatchPath(matchId: string): string {
  return `/api/v1/matches/${encodedIdentifier(matchId)}`;
}

export function getSquad(matchId: string, init: RequestInit = {}): Promise<SquadResponse> {
  return apiRequest<SquadResponse>(`${buildMatchPath(matchId)}/squad`, init);
}

export function saveSquad(
  matchId: string,
  input: SaveSquadInput,
  init: RequestInit = {},
): Promise<Squad> {
  return apiRequest<Squad>(`${buildMatchPath(matchId)}/squad`, {
    ...init,
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function lockSquad(
  matchId: string,
  input: LockSquadInput,
  init: RequestInit = {},
): Promise<LockSquadResult> {
  return apiRequest<LockSquadResult>(`${buildMatchPath(matchId)}/squad/lock`, {
    ...init,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function startSquadBuilding(
  matchId: string,
  init: RequestInit = {},
): Promise<StartSquadBuildingResult> {
  return apiRequest<StartSquadBuildingResult>(`${buildMatchPath(matchId)}/squad-building/start`, {
    ...init,
    method: 'POST',
  });
}
