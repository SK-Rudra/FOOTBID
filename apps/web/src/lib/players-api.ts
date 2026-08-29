import { apiRequest } from './api-client';

export const PLAYER_POSITIONS = [
  'GK',
  'LB',
  'LWB',
  'CB',
  'RB',
  'RWB',
  'CDM',
  'CM',
  'CAM',
  'LM',
  'RM',
  'LW',
  'RW',
  'CF',
  'ST',
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];
export type PreferredFoot = 'LEFT' | 'RIGHT' | 'BOTH';

export type PlayerSortField =
  | 'overall'
  | 'marketValue'
  | 'fullName'
  | 'pace'
  | 'shooting'
  | 'passing'
  | 'dribbling'
  | 'defending'
  | 'physical';

export type SortDirection = 'asc' | 'desc';

export interface CatalogClub {
  id: string;
  name: string;
  shortName: string;
  countryCode: string;
}

export interface CatalogLeague {
  id: string;
  name: string;
  slug: string;
  countryCode: string;
}

export interface LicensedPlayerImage {
  url: string;
  license: string;
}

export interface CatalogPlayer {
  id: string;
  fullName: string;
  shortName: string;
  nationalityCode: string;
  primaryPosition: PlayerPosition;
  secondaryPositions: PlayerPosition[];
  preferredFoot: PreferredFoot;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping: number;
  marketValue: number;
  image: LicensedPlayerImage | null;
  club: CatalogClub | null;
  league: CatalogLeague | null;
}

export interface PlayerDetail extends CatalogPlayer {
  dateOfBirth: string | null;
  dataVersion: string;
  updatedAt: string;
}

export interface CatalogFilterClub extends CatalogClub {
  leagueId: string | null;
}

export interface PlayerFilters {
  positions: PlayerPosition[];
  leagues: CatalogLeague[];
  clubs: CatalogFilterClub[];
  nationalities: string[];
}

export interface PlayerCatalogResponse {
  data: CatalogPlayer[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface PlayerCatalogQuery {
  search?: string;
  position?: PlayerPosition;
  leagueId?: string;
  clubId?: string;
  nationalityCode?: string;
  minOverall?: number;
  maxOverall?: number;
  sortBy?: PlayerSortField;
  sortOrder?: SortDirection;
  page?: number;
  pageSize?: number;
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

export function buildPlayerCatalogPath(query: PlayerCatalogQuery = {}): string {
  const params = new URLSearchParams();

  appendQueryValue(params, 'search', query.search?.trim());
  appendQueryValue(params, 'position', query.position);
  appendQueryValue(params, 'leagueId', query.leagueId);
  appendQueryValue(params, 'clubId', query.clubId);
  appendQueryValue(params, 'nationalityCode', query.nationalityCode);
  appendQueryValue(params, 'minOverall', query.minOverall);
  appendQueryValue(params, 'maxOverall', query.maxOverall);
  appendQueryValue(params, 'sortBy', query.sortBy);
  appendQueryValue(params, 'sortOrder', query.sortOrder);
  appendQueryValue(params, 'page', query.page);
  appendQueryValue(params, 'pageSize', query.pageSize);

  const queryString = params.toString();

  return queryString ? `/api/v1/players?${queryString}` : '/api/v1/players';
}

export function getPlayers(
  query: PlayerCatalogQuery = {},
  init: RequestInit = {},
): Promise<PlayerCatalogResponse> {
  return apiRequest<PlayerCatalogResponse>(buildPlayerCatalogPath(query), init);
}

export function getPlayerFilters(init: RequestInit = {}): Promise<PlayerFilters> {
  return apiRequest<PlayerFilters>('/api/v1/players/filters', init);
}

export function getPlayer(id: string, init: RequestInit = {}): Promise<PlayerDetail> {
  return apiRequest<PlayerDetail>(`/api/v1/players/${encodeURIComponent(id)}`, init);
}
