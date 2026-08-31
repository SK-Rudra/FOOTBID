import { apiRequest } from './api-client';
import type { CatalogClub, CatalogFilterClub, CatalogLeague } from './players-api';

export type ManagerSortField =
  | 'overall'
  | 'marketValue'
  | 'fullName'
  | 'attacking'
  | 'defending'
  | 'adaptability'
  | 'manManagement';

export type ManagerSortDirection = 'asc' | 'desc';
export type ManagerTier = 'FREE' | 'PREMIUM';

export interface LicensedManagerImage {
  url: string;
  license: string;
}

export interface CatalogManager {
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
  tier: ManagerTier;
  image: LicensedManagerImage | null;
  club: CatalogClub | null;
  league: CatalogLeague | null;
}

export interface ManagerFilters {
  leagues: CatalogLeague[];
  clubs: CatalogFilterClub[];
  nationalities: string[];
  tacticalStyles: string[];
  preferredFormations: string[];
  passingPhilosophies: string[];
  defensivePhilosophies: string[];
  pressingStyles: string[];
}

export interface ManagerCatalogResponse {
  data: CatalogManager[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ManagerCatalogQuery {
  search?: string;
  tacticalStyle?: string;
  preferredFormation?: string;
  leagueId?: string;
  clubId?: string;
  nationalityCode?: string;
  minOverall?: number;
  maxOverall?: number;
  sortBy?: ManagerSortField;
  sortOrder?: ManagerSortDirection;
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

export function buildManagerCatalogPath(query: ManagerCatalogQuery = {}): string {
  const params = new URLSearchParams();

  appendQueryValue(params, 'search', query.search?.trim());
  appendQueryValue(params, 'tacticalStyle', query.tacticalStyle);
  appendQueryValue(params, 'preferredFormation', query.preferredFormation);
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

  return queryString ? `/api/v1/managers?${queryString}` : '/api/v1/managers';
}

export function getManagers(
  query: ManagerCatalogQuery = {},
  init: RequestInit = {},
): Promise<ManagerCatalogResponse> {
  return apiRequest<ManagerCatalogResponse>(buildManagerCatalogPath(query), init);
}

export function getManagerFilters(init: RequestInit = {}): Promise<ManagerFilters> {
  return apiRequest<ManagerFilters>('/api/v1/managers/filters', init);
}
