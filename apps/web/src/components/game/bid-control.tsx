'use client';

import { Gavel, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface BidControlProps {
  minimumBidMillions: number;
  budgetMillions: number;
  stepMillions?: number;
  onBid?: (bidMillions: number) => void;
}

export function BidControl({
  minimumBidMillions,
  budgetMillions,
  stepMillions = 1,
  onBid,
}: BidControlProps) {
  const [bid, setBid] = useState(minimumBidMillions);

  const decrease = () => {
    setBid((current) => Math.max(minimumBidMillions, current - stepMillions));
  };

  const increase = () => {
    setBid((current) => Math.min(budgetMillions, current + stepMillions));
  };

  return (
    <div className="rounded-2xl border border-line bg-black/20 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Your bid</p>
          <p className="mt-1 font-mono text-2xl font-black text-foreground">€{bid}M</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={decrease}
            disabled={bid <= minimumBidMillions}
            aria-label={`Decrease bid by €${stepMillions} million`}
          >
            <Minus aria-hidden="true" className="size-4" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={increase}
            disabled={bid >= budgetMillions}
            aria-label={`Increase bid by €${stepMillions} million`}
          >
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <Button type="button" className="mt-4 w-full" onClick={() => onBid?.(bid)}>
        <Gavel aria-hidden="true" className="size-4" />
        Place preview bid
      </Button>

      <p className="mt-3 text-center text-xs text-muted">
        Preview only. The real-time auction engine arrives in Phase 7.
      </p>
    </div>
  );
}
