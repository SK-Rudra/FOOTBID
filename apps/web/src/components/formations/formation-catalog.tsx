'use client';

import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { FormationCard } from '@/components/formations/formation-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Select } from '@/components/ui/select';
import { ApiRequestError } from '@/lib/api-client';
import {
  getFormationFilters,
  getFormations,
  type FormationCatalogQuery,
  type FormationCatalogResponse,
  type FormationFilters,
  type FormationSortDirection,
  type FormationSortField,
  type FormationTier,
} from '@/lib/formations-api';

interface FilterDraft {
  search: string;
  buildUpStyle: string;
  attackingStyle: string;
  defensiveStyle: string;
  tier: '' | FormationTier;
  minMarketValue: string;
  maxMarketValue: string;
  sortBy: FormationSortField;
  sortOrder: FormationSortDirection;
}

const initialDraft: FilterDraft = {
  search: '',
  buildUpStyle: '',
  attackingStyle: '',
  defensiveStyle: '',
  tier: '',
  minMarketValue: '',
  maxMarketValue: '',
  sortBy: 'name',
  sortOrder: 'asc',
};

const initialQuery: FormationCatalogQuery = {
  page: 1,
  pageSize: 12,
  sortBy: 'name',
  sortOrder: 'asc',
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function requestErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'The formation database could not be loaded.';
}

function optionalNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export function FormationCatalog() {
  const [draft, setDraft] = useState<FilterDraft>(initialDraft);
  const [query, setQuery] = useState<FormationCatalogQuery>(initialQuery);
  const [filters, setFilters] = useState<FormationFilters | null>(null);
  const [response, setResponse] = useState<FormationCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void getFormationFilters({
      signal: controller.signal,
    })
      .then(setFilters)
      .catch((requestError: unknown) => {
        if (!isAbortError(requestError)) {
          setFiltersError('Some formation filters are temporarily unavailable.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setFiltersLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void getFormations(query, {
      signal: controller.signal,
    })
      .then((result) => {
        setResponse(result);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (!isAbortError(requestError)) {
          setError(requestErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query, reloadKey]);

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const minMarketValue = optionalNumber(draft.minMarketValue);
    const maxMarketValue = optionalNumber(draft.maxMarketValue);

    if (
      minMarketValue !== undefined &&
      maxMarketValue !== undefined &&
      minMarketValue > maxMarketValue
    ) {
      setError('Minimum market value cannot be greater than maximum market value.');
      return;
    }

    setLoading(true);
    setError(null);
    setQuery({
      search: draft.search.trim() || undefined,
      buildUpStyle: draft.buildUpStyle || undefined,
      attackingStyle: draft.attackingStyle || undefined,
      defensiveStyle: draft.defensiveStyle || undefined,
      tier: draft.tier || undefined,
      minMarketValue,
      maxMarketValue,
      sortBy: draft.sortBy,
      sortOrder: draft.sortOrder,
      page: 1,
      pageSize: 12,
    });
    setReloadKey((current) => current + 1);
  }

  function resetFilters(): void {
    setDraft(initialDraft);
    setLoading(true);
    setError(null);
    setQuery(initialQuery);
    setReloadKey((current) => current + 1);
  }

  function goToPage(page: number): void {
    setLoading(true);
    setError(null);
    setQuery((current) => ({
      ...current,
      page,
    }));
  }

  function retry(): void {
    setLoading(true);
    setError(null);
    setReloadKey((current) => current + 1);
  }

  const pagination = response?.pagination;

  return (
    <div className="grid gap-6 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <Card className="h-fit lg:sticky lg:top-24">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            </span>

            <div>
              <h2 className="font-extrabold text-foreground">Refine formations</h2>
              <p className="mt-1 text-xs text-muted">Compare shapes, styles, and bonuses.</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={applyFilters} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Search
              </span>

              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted"
                />

                <Input
                  value={draft.search}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  className="pl-11"
                  placeholder="Name, code, or tactical style"
                  maxLength={120}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Build-up style
              </span>

              <Select
                value={draft.buildUpStyle}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    buildUpStyle: event.target.value,
                  }))
                }
              >
                <option value="">All build-up styles</option>

                {filters?.buildUpStyles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Attacking style
              </span>

              <Select
                value={draft.attackingStyle}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    attackingStyle: event.target.value,
                  }))
                }
              >
                <option value="">All attacking styles</option>

                {filters?.attackingStyles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Defensive style
              </span>

              <Select
                value={draft.defensiveStyle}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    defensiveStyle: event.target.value,
                  }))
                }
              >
                <option value="">All defensive styles</option>

                {filters?.defensiveStyles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Tier
              </span>

              <Select
                value={draft.tier}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tier: event.target.value as '' | FormationTier,
                  }))
                }
              >
                <option value="">All tiers</option>

                {filters?.tiers.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </Select>
            </label>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Market value range
              </legend>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  max={150_000_000}
                  step={100_000}
                  aria-label="Minimum formation market value"
                  placeholder="Min"
                  value={draft.minMarketValue}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      minMarketValue: event.target.value,
                    }))
                  }
                />

                <Input
                  type="number"
                  min={0}
                  max={150_000_000}
                  step={100_000}
                  aria-label="Maximum formation market value"
                  placeholder="Max"
                  value={draft.maxMarketValue}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      maxMarketValue: event.target.value,
                    }))
                  }
                />
              </div>
            </fieldset>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Sort
              </span>

              <Select
                value={`${draft.sortBy}:${draft.sortOrder}`}
                onChange={(event) => {
                  const [sortBy, sortOrder] = event.target.value.split(':') as [
                    FormationSortField,
                    FormationSortDirection,
                  ];

                  setDraft((current) => ({
                    ...current,
                    sortBy,
                    sortOrder,
                  }));
                }}
              >
                <option value="name:asc">Name: A to Z</option>
                <option value="marketValue:desc">Market value: high to low</option>
                <option value="width:desc">Widest shape</option>
                <option value="tempo:desc">Highest tempo</option>
                <option value="pressingIntensity:desc">Highest pressing</option>
                <option value="attackingBonus:desc">Best attack bonus</option>
                <option value="midfieldBonus:desc">Best midfield bonus</option>
                <option value="defendingBonus:desc">Best defence bonus</option>
                <option value="chemistryBonus:desc">Best chemistry bonus</option>
              </Select>
            </label>

            {filtersError && (
              <p role="status" className="text-xs leading-5 text-warning">
                {filtersError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button type="submit">Apply</Button>

              <Button type="button" variant="secondary" onClick={resetFilters}>
                <RotateCcw aria-hidden="true" className="size-4" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-busy={loading}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Tactical shapes
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-foreground">
              {pagination ? `${pagination.total} active formations` : 'Active formations'}
            </h2>
          </div>

          {pagination && pagination.total > 0 && (
            <p className="text-sm text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          )}
        </div>

        {loading ? (
          <LoadingState label="Loading formation database" className="min-h-96" />
        ) : error ? (
          <ErrorState
            description={error}
            action={
              <Button type="button" variant="secondary" onClick={retry}>
                Try again
              </Button>
            }
          />
        ) : !response || response.data.length === 0 ? (
          <EmptyState
            title="No formations found"
            description="Clear one or more filters to widen the tactical search."
            action={
              <Button type="button" variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {response.data.map((formation) => (
                <FormationCard key={formation.id} formation={formation} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <nav
                aria-label="Formation results pagination"
                className="mt-8 flex items-center justify-center gap-3"
              >
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => goToPage(pagination.page - 1)}
                >
                  Previous
                </Button>

                <span className="min-w-24 text-center text-sm font-bold text-muted">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => goToPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
