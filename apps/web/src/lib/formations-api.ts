import { apiRequest } from './api-client';

export type FormationTier = 'FREE' | 'PREMIUM';

export type FormationSortField =
  | 'name'
  | 'marketValue'
  | 'width'
  | 'tempo'
  | 'pressingIntensity'
  | 'attackingBonus'
  | 'midfieldBonus'
  | 'defendingBonus'
  | 'chemistryBonus';

export type FormationSortDirection = 'asc' | 'desc';

export interface FormationSlot {
  slot: number;
  position: string;
  x: number;
  y: number;
}

export interface FormationShape {
  version: number;
  slots: FormationSlot[];
}

export interface CatalogFormation {
  id: string;
  code: string;
  name: string;
  description: string | null;
  shape: FormationShape;
  buildUpStyle: string;
  attackingStyle: string;
  defensiveStyle: string;
  width: number;
  tempo: number;
  pressingIntensity: number;
  attackingBonus: number;
  midfieldBonus: number;
  defendingBonus: number;
  chemistryBonus: number;
  marketValue: number;
  tier: FormationTier;
  isNeutral: boolean;
}

export interface FormationDetail extends CatalogFormation {
  dataVersion: string;
  updatedAt: string;
}

export interface FormationFilters {
  buildUpStyles: string[];
  attackingStyles: string[];
  defensiveStyles: string[];
  tiers: FormationTier[];
  marketValueRange: {
    min: number;
    max: number;
  };
}

export interface FormationCatalogResponse {
  data: CatalogFormation[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface FormationCatalogQuery {
  search?: string;
  buildUpStyle?: string;
  attackingStyle?: string;
  defensiveStyle?: string;
  tier?: FormationTier;
  minMarketValue?: number;
  maxMarketValue?: number;
  sortBy?: FormationSortField;
  sortOrder?: FormationSortDirection;
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

function encodedIdentifier(identifier: string): string {
  return encodeURIComponent(identifier.trim());
}

export function buildFormationCatalogPath(query: FormationCatalogQuery = {}): string {
  const params = new URLSearchParams();

  appendQueryValue(params, 'search', query.search?.trim());
  appendQueryValue(params, 'buildUpStyle', query.buildUpStyle);
  appendQueryValue(params, 'attackingStyle', query.attackingStyle);
  appendQueryValue(params, 'defensiveStyle', query.defensiveStyle);
  appendQueryValue(params, 'tier', query.tier);
  appendQueryValue(params, 'minMarketValue', query.minMarketValue);
  appendQueryValue(params, 'maxMarketValue', query.maxMarketValue);
  appendQueryValue(params, 'sortBy', query.sortBy);
  appendQueryValue(params, 'sortOrder', query.sortOrder);
  appendQueryValue(params, 'page', query.page);
  appendQueryValue(params, 'pageSize', query.pageSize);

  const queryString = params.toString();

  return queryString ? `/api/v1/formations?${queryString}` : '/api/v1/formations';
}

export function getFormations(
  query: FormationCatalogQuery = {},
  init: RequestInit = {},
): Promise<FormationCatalogResponse> {
  return apiRequest<FormationCatalogResponse>(buildFormationCatalogPath(query), init);
}

export function getFormationFilters(init: RequestInit = {}): Promise<FormationFilters> {
  return apiRequest<FormationFilters>('/api/v1/formations/filters', init);
}

export function getFormation(id: string, init: RequestInit = {}): Promise<FormationDetail> {
  return apiRequest<FormationDetail>(`/api/v1/formations/${encodedIdentifier(id)}`, init);
}
