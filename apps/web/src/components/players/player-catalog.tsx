'use client';

import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CatalogPlayerCard } from '@/components/game/catalog-player-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { Select } from '@/components/ui/select';
import { ApiRequestError } from '@/lib/api-client';
import {
  getPlayerFilters,
  getPlayers,
  PLAYER_POSITIONS,
  type PlayerCatalogQuery,
  type PlayerCatalogResponse,
  type PlayerFilters,
  type PlayerPosition,
  type PlayerSortField,
  type SortDirection,
} from '@/lib/players-api';

interface FilterDraft {
  search: string;
  position: '' | PlayerPosition;
  leagueId: string;
  clubId: string;
  nationalityCode: string;
  minOverall: string;
  maxOverall: string;
  sortBy: PlayerSortField;
  sortOrder: SortDirection;
}

const initialDraft: FilterDraft = {
  search: '',
  position: '',
  leagueId: '',
  clubId: '',
  nationalityCode: '',
  minOverall: '',
  maxOverall: '',
  sortBy: 'overall',
  sortOrder: 'desc',
};

const initialQuery: PlayerCatalogQuery = {
  page: 1,
  pageSize: 12,
  sortBy: 'overall',
  sortOrder: 'desc',
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function errorMessage(error: unknown): string {
  return error instanceof ApiRequestError
    ? error.message
    : 'The player database could not be loaded.';
}

function optionalNumber(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export function PlayerCatalog() {
  const [draft, setDraft] = useState<FilterDraft>(initialDraft);
  const [query, setQuery] = useState<PlayerCatalogQuery>(initialQuery);
  const [filters, setFilters] = useState<PlayerFilters | null>(null);
  const [response, setResponse] = useState<PlayerCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void getPlayerFilters({
      signal: controller.signal,
    })
      .then(setFilters)
      .catch((requestError: unknown) => {
        if (!isAbortError(requestError)) {
          setFiltersError('Some filter options are temporarily unavailable.');
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

    void getPlayers(query, {
      signal: controller.signal,
    })
      .then(setResponse)
      .catch((requestError: unknown) => {
        if (!isAbortError(requestError)) {
          setError(errorMessage(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query, reloadKey]);

  const availableClubs = useMemo(() => {
    const clubs = filters?.clubs ?? [];

    if (!draft.leagueId) {
      return clubs;
    }

    return clubs.filter((club) => club.leagueId === draft.leagueId);
  }, [draft.leagueId, filters]);

  function applyFilters(event: React.FormEvent<HTMLFormElement>): void {
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
      position: draft.position || undefined,
      leagueId: draft.leagueId || undefined,
      clubId: draft.clubId || undefined,
      nationalityCode: draft.nationalityCode || undefined,
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

  function retryPlayers(): void {
    setLoading(true);
    setError(null);
    setReloadKey((current) => current + 1);
  }

  const positions = filters?.positions ?? [...PLAYER_POSITIONS];
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
              <h2 className="font-extrabold text-foreground">Refine database</h2>
              <p className="mt-1 text-xs text-muted">Combine any available filters.</p>
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
                  placeholder="Player, club or league"
                  maxLength={120}
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Position
              </span>

              <Select
                value={draft.position}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    position: event.target.value as '' | PlayerPosition,
                  }))
                }
              >
                <option value="">All positions</option>

                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                League
              </span>

              <Select
                value={draft.leagueId}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    leagueId: event.target.value,
                    clubId: '',
                  }))
                }
              >
                <option value="">All leagues</option>

                {filters?.leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Club
              </span>

              <Select
                value={draft.clubId}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    clubId: event.target.value,
                  }))
                }
              >
                <option value="">All clubs</option>

                {availableClubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Nationality
              </span>

              <Select
                value={draft.nationalityCode}
                disabled={filtersLoading}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    nationalityCode: event.target.value,
                  }))
                }
              >
                <option value="">All nationalities</option>

                {filters?.nationalities.map((code) => (
                  <option key={code} value={code}>
                    {code}
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
                  inputMode="numeric"
                  aria-label="Minimum overall"
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
                  inputMode="numeric"
                  aria-label="Maximum overall"
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
                    PlayerSortField,
                    SortDirection,
                  ];

                  setDraft((current) => ({
                    ...current,
                    sortBy,
                    sortOrder,
                  }));
                }}
              >
                <option value="overall:desc">Overall: high to low</option>
                <option value="overall:asc">Overall: low to high</option>
                <option value="marketValue:desc">Market value: high to low</option>
                <option value="fullName:asc">Name: A to Z</option>
                <option value="pace:desc">Best pace</option>
                <option value="shooting:desc">Best shooting</option>
                <option value="passing:desc">Best passing</option>
                <option value="dribbling:desc">Best dribbling</option>
                <option value="defending:desc">Best defending</option>
                <option value="physical:desc">Best physical</option>
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

      <section id="player-results" aria-busy={loading}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Scouting results
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-foreground">
              {pagination ? `${pagination.total} active players` : 'Active players'}
            </h2>
          </div>

          {pagination && pagination.total > 0 && (
            <p className="text-sm text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </p>
          )}
        </div>

        {loading ? (
          <LoadingState label="Loading player database" className="min-h-96" />
        ) : error ? (
          <ErrorState
            description={error}
            action={
              <Button type="button" variant="secondary" onClick={retryPlayers}>
                Try again
              </Button>
            }
          />
        ) : !response || response.data.length === 0 ? (
          <EmptyState
            title="No players found"
            description="Try clearing one or more filters to widen the scouting search."
            action={
              <Button type="button" variant="secondary" onClick={resetFilters}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {response.data.map((player) => (
                <CatalogPlayerCard key={player.id} player={player} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <nav
                aria-label="Player results pagination"
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
