'use client';

import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { ManagerCard } from '@/components/managers/manager-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Select } from '@/components/ui/select';
import { ApiRequestError } from '@/lib/api-client';
import {
  getManagerFilters,
  getManagers,
  type ManagerCatalogQuery,
  type ManagerCatalogResponse,
  type ManagerFilters,
  type ManagerSortDirection,
  type ManagerSortField,
} from '@/lib/managers-api';

interface FilterDraft {
  search: string;
  tacticalStyle: string;
  preferredFormation: string;
  minOverall: string;
  maxOverall: string;
  sortBy: ManagerSortField;
  sortOrder: ManagerSortDirection;
}

const initialDraft: FilterDraft = {
  search: '',
  tacticalStyle: '',
  preferredFormation: '',
  minOverall: '',
  maxOverall: '',
  sortBy: 'overall',
  sortOrder: 'desc',
};

const initialQuery: ManagerCatalogQuery = {
  page: 1,
  pageSize: 12,
  sortBy: 'overall',
  sortOrder: 'desc',
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function requestErrorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'The manager database could not be loaded.';
}

function optionalNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export function ManagerCatalog() {
  const [draft, setDraft] = useState<FilterDraft>(initialDraft);
  const [query, setQuery] = useState<ManagerCatalogQuery>(initialQuery);
  const [filters, setFilters] = useState<ManagerFilters | null>(null);
  const [response, setResponse] = useState<ManagerCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void getManagerFilters({
      signal: controller.signal,
    })
      .then(setFilters)
      .catch((requestError: unknown) => {
        if (!isAbortError(requestError)) {
          setFiltersError('Some manager filters are temporarily unavailable.');
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

    void getManagers(query, {
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

    const minOverall = optionalNumber(draft.minOverall);
    const maxOverall = optionalNumber(draft.maxOverall);

    if (minOverall !== undefined && maxOverall !== undefined && minOverall > maxOverall) {
      setError('Minimum overall cannot be greater than maximum overall.');
      return;
    }

    setLoading(true);
    setError(null);
    setQuery({
      search: draft.search.trim() || undefined,
      tacticalStyle: draft.tacticalStyle || undefined,
      preferredFormation: draft.preferredFormation || undefined,
      minOverall,
      maxOverall,
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
            <span className="grid size-10 place-items-center rounded-xl border border-info/20 bg-info/10 text-info">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            </span>

            <div>
              <h2 className="font-extrabold text-foreground">Refine managers</h2>
              <p className="mt-1 text-xs text-muted">Compare styles, shapes, and ratings.</p>
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
                  placeholder="Manager, club, or style"
                  maxLength={120}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Tactical style
              </span>

              <Select
                value={draft.tacticalStyle}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tacticalStyle: event.target.value,
                  }))
                }
              >
                <option value="">All styles</option>

                {filters?.tacticalStyles.map((style) => (
                  <option key={style} value={style}>
                    {style}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Preferred formation
              </span>

              <Select
                value={draft.preferredFormation}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    preferredFormation: event.target.value,
                  }))
                }
              >
                <option value="">All formations</option>

                {filters?.preferredFormations.map((formation) => (
                  <option key={formation} value={formation}>
                    {formation}
                  </option>
                ))}
              </Select>
            </label>

            <fieldset>
              <legend className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Overall range
              </legend>

              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  max={99}
                  aria-label="Minimum manager overall"
                  placeholder="Min"
                  value={draft.minOverall}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      minOverall: event.target.value,
                    }))
                  }
                />

                <Input
                  type="number"
                  min={0}
                  max={99}
                  aria-label="Maximum manager overall"
                  placeholder="Max"
                  value={draft.maxOverall}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      maxOverall: event.target.value,
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
                    ManagerSortField,
                    ManagerSortDirection,
                  ];

                  setDraft((current) => ({
                    ...current,
                    sortBy,
                    sortOrder,
                  }));
                }}
              >
                <option value="overall:desc">Overall: high to low</option>
                <option value="marketValue:desc">Market value: high to low</option>
                <option value="fullName:asc">Name: A to Z</option>
                <option value="attacking:desc">Best attacking</option>
                <option value="defending:desc">Best defending</option>
                <option value="adaptability:desc">Best adaptability</option>
                <option value="manManagement:desc">Best man management</option>
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
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-info">
              Tactical shortlist
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-foreground">
              {pagination ? `${pagination.total} auctionable managers` : 'Auctionable managers'}
            </h2>
          </div>

          {pagination && pagination.total > 0 && (
            <p className="text-sm text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          )}
        </div>

        {loading ? (
          <LoadingState label="Loading manager database" className="min-h-96" />
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
            title="No managers found"
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
              {response.data.map((manager) => (
                <ManagerCard key={manager.id} manager={manager} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <nav
                aria-label="Manager results pagination"
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
