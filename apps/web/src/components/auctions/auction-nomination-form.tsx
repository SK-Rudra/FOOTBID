'use client';

import { LoaderCircle, UserRoundPlus } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { createPlayerAuction, type AuctionMutationResult } from '@/lib/auctions-api';
import { ApiRequestError } from '@/lib/api-client';
import { getPlayers, type CatalogPlayer } from '@/lib/players-api';

interface AuctionNominationFormProps {
  matchId: string;
  onCreated: (result: AuctionMutationResult) => void;
}

interface NominationErrors {
  playerId?: string;
  openingPrice?: string;
  minimumIncrement?: string;
}

function formatPrice(amount: number): string {
  const millions = amount / 1_000_000;

  return `€${millions.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}M`;
}

function validMoneyAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function AuctionNominationForm({ matchId, onCreated }: AuctionNominationFormProps) {
  const { showToast } = useToast();

  const [players, setPlayers] = useState<CatalogPlayer[]>([]);
  const [playerId, setPlayerId] = useState('');
  const [openingPrice, setOpeningPrice] = useState('');
  const [minimumIncrement, setMinimumIncrement] = useState('1000000');
  const [errors, setErrors] = useState<NominationErrors>({});
  const [playerLoadError, setPlayerLoadError] = useState<string | null>(null);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadPlayers = async () => {
      try {
        const response = await getPlayers(
          {
            sortBy: 'overall',
            sortOrder: 'desc',
            page: 1,
            pageSize: 50,
          },
          {
            signal: controller.signal,
          },
        );

        if (!active) {
          return;
        }

        setPlayers(response.data);
        setPlayerLoadError(null);

        const firstPlayer = response.data[0];

        if (firstPlayer) {
          setPlayerId(firstPlayer.id);
          setOpeningPrice(String(firstPlayer.marketValue));
        }
      } catch {
        if (active) {
          setPlayerLoadError('The player catalogue could not be loaded.');
        }
      } finally {
        if (active) {
          setPlayersLoading(false);
        }
      }
    };

    void loadPlayers();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const selectPlayer = (selectedPlayerId: string) => {
    setPlayerId(selectedPlayerId);
    setErrors((current) => ({
      ...current,
      playerId: undefined,
    }));

    const selectedPlayer = players.find((player) => player.id === selectedPlayerId);

    if (selectedPlayer) {
      setOpeningPrice(String(selectedPlayer.marketValue));
      setErrors((current) => ({
        ...current,
        openingPrice: undefined,
      }));
    }
  };

  const submitNomination = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedOpeningPrice = Number(openingPrice);
    const parsedMinimumIncrement = Number(minimumIncrement);
    const nextErrors: NominationErrors = {};

    if (!playerId) {
      nextErrors.playerId = 'Select a player to nominate.';
    }

    if (!validMoneyAmount(parsedOpeningPrice)) {
      nextErrors.openingPrice = 'Enter a positive whole-number opening price.';
    }

    if (!validMoneyAmount(parsedMinimumIncrement)) {
      nextErrors.minimumIncrement = 'Enter a positive whole-number bid increment.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await createPlayerAuction(matchId, {
        playerId,
        openingPrice: parsedOpeningPrice,
        minimumIncrement: parsedMinimumIncrement,
      });

      onCreated(result);

      showToast({
        title: 'Player nominated',
        description: `${result.auction.player?.shortName ?? 'The player'} is ready for auction.`,
        tone: 'success',
      });
    } catch (error: unknown) {
      showToast({
        title: 'Nomination failed',
        description:
          error instanceof ApiRequestError
            ? error.message
            : 'Check the API connection and try again.',
        tone: 'danger',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card tone="glass">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            <UserRoundPlus aria-hidden="true" className="size-5" />
          </div>

          <div>
            <CardTitle>Nominate the next player</CardTitle>
            <CardDescription>
              Select a player and configure the opening bid. Only the match host can create an
              auction.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {playerLoadError ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {playerLoadError}
          </p>
        ) : (
          <form onSubmit={submitNomination} className="grid gap-5 lg:grid-cols-3">
            <FormField
              label="Player"
              htmlFor="auction-player"
              error={errors.playerId}
              required
              className="lg:col-span-3"
            >
              <Select
                id="auction-player"
                value={playerId}
                onChange={(event) => selectPlayer(event.target.value)}
                disabled={playersLoading || submitting}
                hasError={Boolean(errors.playerId)}
                aria-describedby={errors.playerId ? 'auction-player-message' : undefined}
              >
                {playersLoading ? (
                  <option value="">Loading players…</option>
                ) : players.length === 0 ? (
                  <option value="">No players available</option>
                ) : (
                  players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.shortName} · {player.primaryPosition} · OVR {player.overall} ·{' '}
                      {formatPrice(player.marketValue)}
                    </option>
                  ))
                )}
              </Select>
            </FormField>

            <FormField
              label="Opening price"
              htmlFor="auction-opening-price"
              hint="The selected player’s market value is used initially."
              error={errors.openingPrice}
              required
            >
              <Input
                id="auction-opening-price"
                type="number"
                min="1"
                step="1"
                value={openingPrice}
                onChange={(event) => {
                  setOpeningPrice(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    openingPrice: undefined,
                  }));
                }}
                disabled={submitting}
                hasError={Boolean(errors.openingPrice)}
                aria-describedby="auction-opening-price-message"
              />
            </FormField>

            <FormField
              label="Minimum increment"
              htmlFor="auction-minimum-increment"
              hint="For example, 1000000 represents €1M."
              error={errors.minimumIncrement}
              required
            >
              <Input
                id="auction-minimum-increment"
                type="number"
                min="1"
                step="1"
                value={minimumIncrement}
                onChange={(event) => {
                  setMinimumIncrement(event.target.value);
                  setErrors((current) => ({
                    ...current,
                    minimumIncrement: undefined,
                  }));
                }}
                disabled={submitting}
                hasError={Boolean(errors.minimumIncrement)}
                aria-describedby="auction-minimum-increment-message"
              />
            </FormField>

            <div className="flex items-end">
              <Button
                type="submit"
                disabled={playersLoading || players.length === 0 || submitting}
                className="w-full"
              >
                {submitting ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : (
                  <UserRoundPlus aria-hidden="true" className="size-4" />
                )}

                {submitting ? 'Nominating…' : 'Nominate player'}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
