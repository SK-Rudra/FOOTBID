'use client';

import { BrainCircuit, Grid3X3, LoaderCircle, UserRoundPlus } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import {
  createFormationAuction,
  createManagerAuction,
  createPlayerAuction,
  type AuctionMutationResult,
} from '@/lib/auctions-api';
import { ApiRequestError } from '@/lib/api-client';
import { getFormations, type CatalogFormation } from '@/lib/formations-api';
import { getManagers, type CatalogManager } from '@/lib/managers-api';
import { getPlayers, type CatalogPlayer } from '@/lib/players-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';

type AuctionAssetType = 'PLAYER' | 'MANAGER' | 'FORMATION';

interface AuctionNominationFormProps {
  matchId: string;
  onCreated: (result: AuctionMutationResult) => void;
}

interface NominationErrors {
  assetId?: string;
  openingPrice?: string;
  minimumIncrement?: string;
}

const MIN_OPENING_PRICE = 100_000;
const MAX_AUCTION_PRICE = 150_000_000;
const MIN_INCREMENT = 100_000;
const MAX_INCREMENT = 10_000_000;

const assetLabels: Record<AuctionAssetType, string> = {
  PLAYER: 'Player',
  MANAGER: 'Manager',
  FORMATION: 'Formation',
};

function formatPrice(amount: number): string {
  const millions = amount / 1_000_000;

  return `\u20AC${millions.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}M`;
}

function validMoneyAmount(value: number, minimum: number, maximum: number): boolean {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}

export function AuctionNominationForm({ matchId, onCreated }: AuctionNominationFormProps) {
  const { showToast } = useToast();

  const [assetType, setAssetType] = useState<AuctionAssetType>('PLAYER');
  const [players, setPlayers] = useState<CatalogPlayer[]>([]);
  const [managers, setManagers] = useState<CatalogManager[]>([]);
  const [formations, setFormations] = useState<CatalogFormation[]>([]);
  const [assetId, setAssetId] = useState('');
  const [openingPrice, setOpeningPrice] = useState('');
  const [minimumIncrement, setMinimumIncrement] = useState('1000000');
  const [errors, setErrors] = useState<NominationErrors>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const loadAssets = async () => {
      try {
        const [playerResponse, managerResponse, formationResponse] = await Promise.all([
          getPlayers(
            {
              sortBy: 'overall',
              sortOrder: 'desc',
              page: 1,
              pageSize: 50,
            },
            {
              signal: controller.signal,
            },
          ),
          getManagers(
            {
              sortBy: 'overall',
              sortOrder: 'desc',
              page: 1,
              pageSize: 50,
            },
            {
              signal: controller.signal,
            },
          ),
          getFormations(
            {
              sortBy: 'marketValue',
              sortOrder: 'desc',
              page: 1,
              pageSize: 50,
            },
            {
              signal: controller.signal,
            },
          ),
        ]);

        if (!active) {
          return;
        }

        setPlayers(playerResponse.data);
        setManagers(managerResponse.data);
        setFormations(formationResponse.data.filter((formation) => !formation.isNeutral));
        setLoadError(null);

        const firstPlayer = playerResponse.data[0];

        if (firstPlayer) {
          setAssetId(firstPlayer.id);
          setOpeningPrice(String(firstPlayer.marketValue));
        }
      } catch {
        if (active) {
          setLoadError('The player, manager, and formation catalogues could not be loaded.');
        }
      } finally {
        if (active) {
          setAssetsLoading(false);
        }
      }
    };

    void loadAssets();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  function assetsForType(nextType: AuctionAssetType) {
    if (nextType === 'PLAYER') {
      return players;
    }

    if (nextType === 'MANAGER') {
      return managers;
    }

    return formations;
  }

  function chooseAssetType(nextType: AuctionAssetType): void {
    setAssetType(nextType);
    setErrors({});

    const firstAsset = assetsForType(nextType)[0];

    setAssetId(firstAsset?.id ?? '');
    setOpeningPrice(firstAsset ? String(firstAsset.marketValue) : '');
  }

  function selectAsset(selectedAssetId: string): void {
    setAssetId(selectedAssetId);
    setErrors((current) => ({
      ...current,
      assetId: undefined,
    }));

    const selectedAsset = assetsForType(assetType).find((asset) => asset.id === selectedAssetId);

    if (selectedAsset) {
      setOpeningPrice(String(selectedAsset.marketValue));
      setErrors((current) => ({
        ...current,
        openingPrice: undefined,
      }));
    }
  }

  async function submitNomination(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const parsedOpeningPrice = Number(openingPrice);
    const parsedMinimumIncrement = Number(minimumIncrement);
    const nextErrors: NominationErrors = {};
    const assetLabel = assetLabels[assetType];

    if (!assetId) {
      nextErrors.assetId = `Select a ${assetLabel.toLowerCase()} to nominate.`;
    }

    if (!validMoneyAmount(parsedOpeningPrice, MIN_OPENING_PRICE, MAX_AUCTION_PRICE)) {
      nextErrors.openingPrice = 'Opening price must be a whole number from 100000 to 150000000.';
    }

    if (!validMoneyAmount(parsedMinimumIncrement, MIN_INCREMENT, MAX_INCREMENT)) {
      nextErrors.minimumIncrement = 'Increment must be a whole number from 100000 to 10000000.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      let result: AuctionMutationResult;

      if (assetType === 'PLAYER') {
        result = await createPlayerAuction(matchId, {
          playerId: assetId,
          openingPrice: parsedOpeningPrice,
          minimumIncrement: parsedMinimumIncrement,
        });
      } else if (assetType === 'MANAGER') {
        result = await createManagerAuction(matchId, {
          managerId: assetId,
          openingPrice: parsedOpeningPrice,
          minimumIncrement: parsedMinimumIncrement,
        });
      } else {
        result = await createFormationAuction(matchId, {
          formationId: assetId,
          openingPrice: parsedOpeningPrice,
          minimumIncrement: parsedMinimumIncrement,
        });
      }

      onCreated(result);

      const assetName =
        result.auction.player?.shortName ??
        result.auction.manager?.fullName ??
        result.auction.formation?.name ??
        `The ${assetLabel.toLowerCase()}`;

      showToast({
        title: `${assetLabel} nominated`,
        description: `${assetName} is ready for auction.`,
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
  }

  const currentAssets = assetsForType(assetType);
  const noAssets = currentAssets.length === 0;
  const assetLabel = assetLabels[assetType];

  return (
    <Card tone="glass">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
            {assetType === 'PLAYER' ? (
              <UserRoundPlus aria-hidden="true" className="size-5" />
            ) : assetType === 'MANAGER' ? (
              <BrainCircuit aria-hidden="true" className="size-5" />
            ) : (
              <Grid3X3 aria-hidden="true" className="size-5" />
            )}
          </div>

          <div>
            <CardTitle>Nominate the next auction asset</CardTitle>
            <CardDescription>
              Choose a player, manager, or formation and configure the opening bid. Only the match
              host can create an auction.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className="mb-5 grid grid-cols-3 gap-2 rounded-2xl border border-line bg-black/20 p-1.5"
          aria-label="Auction asset type"
        >
          <button
            type="button"
            onClick={() => chooseAssetType('PLAYER')}
            aria-pressed={assetType === 'PLAYER'}
            className={
              assetType === 'PLAYER'
                ? 'rounded-xl bg-accent px-3 py-3 text-sm font-black text-black'
                : 'rounded-xl px-3 py-3 text-sm font-bold text-muted transition hover:bg-white/[0.05] hover:text-foreground'
            }
          >
            Players
          </button>

          <button
            type="button"
            onClick={() => chooseAssetType('MANAGER')}
            aria-pressed={assetType === 'MANAGER'}
            className={
              assetType === 'MANAGER'
                ? 'rounded-xl bg-info px-3 py-3 text-sm font-black text-black'
                : 'rounded-xl px-3 py-3 text-sm font-bold text-muted transition hover:bg-white/[0.05] hover:text-foreground'
            }
          >
            Managers
          </button>

          <button
            type="button"
            onClick={() => chooseAssetType('FORMATION')}
            aria-pressed={assetType === 'FORMATION'}
            className={
              assetType === 'FORMATION'
                ? 'rounded-xl bg-warning px-3 py-3 text-sm font-black text-black'
                : 'rounded-xl px-3 py-3 text-sm font-bold text-muted transition hover:bg-white/[0.05] hover:text-foreground'
            }
          >
            Formations
          </button>
        </div>

        {loadError ? (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {loadError}
          </p>
        ) : (
          <form onSubmit={submitNomination} className="grid gap-5 lg:grid-cols-3">
            <FormField
              label={assetLabel}
              htmlFor="auction-asset"
              error={errors.assetId}
              required
              className="lg:col-span-3"
            >
              <Select
                id="auction-asset"
                value={assetId}
                onChange={(event) => selectAsset(event.target.value)}
                disabled={assetsLoading || submitting}
                hasError={Boolean(errors.assetId)}
              >
                {assetsLoading ? (
                  <option value="">Loading assets...</option>
                ) : noAssets ? (
                  <option value="">No {assetLabel.toLowerCase()}s available</option>
                ) : assetType === 'PLAYER' ? (
                  players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.shortName} / {player.primaryPosition} / OVR {player.overall} /{' '}
                      {formatPrice(player.marketValue)}
                    </option>
                  ))
                ) : assetType === 'MANAGER' ? (
                  managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.fullName} / {manager.tacticalStyle} / OVR {manager.overall} /{' '}
                      {formatPrice(manager.marketValue)}
                    </option>
                  ))
                ) : (
                  formations.map((formation) => (
                    <option key={formation.id} value={formation.id}>
                      {formation.name} / {formation.code} / {formation.buildUpStyle} /{' '}
                      {formatPrice(formation.marketValue)}
                    </option>
                  ))
                )}
              </Select>
            </FormField>

            <FormField
              label="Opening price"
              htmlFor="auction-opening-price"
              hint="The selected asset's market value is used initially."
              error={errors.openingPrice}
              required
            >
              <Input
                id="auction-opening-price"
                type="number"
                min={MIN_OPENING_PRICE}
                max={MAX_AUCTION_PRICE}
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
              />
            </FormField>

            <FormField
              label="Minimum increment"
              htmlFor="auction-minimum-increment"
              hint="For example, 1000000 represents EUR 1M."
              error={errors.minimumIncrement}
              required
            >
              <Input
                id="auction-minimum-increment"
                type="number"
                min={MIN_INCREMENT}
                max={MAX_INCREMENT}
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
              />
            </FormField>

            <div className="flex items-end">
              <Button
                type="submit"
                disabled={assetsLoading || noAssets || submitting}
                className="w-full"
              >
                {submitting ? (
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                ) : assetType === 'PLAYER' ? (
                  <UserRoundPlus aria-hidden="true" className="size-4" />
                ) : assetType === 'MANAGER' ? (
                  <BrainCircuit aria-hidden="true" className="size-4" />
                ) : (
                  <Grid3X3 aria-hidden="true" className="size-4" />
                )}

                {submitting ? 'Nominating...' : `Nominate ${assetLabel.toLowerCase()}`}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
