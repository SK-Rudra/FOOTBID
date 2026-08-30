'use client';

import { Gavel, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface LiveBidControlProps {
  minimumBid: number;
  maximumBid: number;
  increment: number;
  submitting?: boolean;
  disabled?: boolean;
  onBid: (amount: number) => void;
}

function formatPrice(amount: number): string {
  const millions = amount / 1_000_000;

  return `€${millions.toLocaleString('en-US', {
    maximumFractionDigits: 2,
  })}M`;
}

export function LiveBidControl({
  minimumBid,
  maximumBid,
  increment,
  submitting = false,
  disabled = false,
  onBid,
}: LiveBidControlProps) {
  const [requestedBidAmount, setRequestedBidAmount] = useState(minimumBid);

  const budgetInsufficient = maximumBid < minimumBid;

  const bidAmount = budgetInsufficient
    ? maximumBid
    : Math.min(maximumBid, Math.max(minimumBid, requestedBidAmount));

  const biddingDisabled = disabled || submitting || budgetInsufficient;

  const decrease = () => {
    setRequestedBidAmount((current) => {
      const normalized = Math.min(maximumBid, Math.max(minimumBid, current));

      return Math.max(minimumBid, normalized - increment);
    });
  };

  const increase = () => {
    setRequestedBidAmount((current) => {
      const normalized = Math.min(maximumBid, Math.max(minimumBid, current));

      return Math.min(maximumBid, normalized + increment);
    });
  };

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent/[0.055] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">Your bid</p>

          <p className="mt-2 font-mono text-3xl font-black tracking-[-0.05em] text-foreground">
            {formatPrice(bidAmount)}
          </p>

          <p className="mt-2 text-xs leading-5 text-muted">
            Minimum {formatPrice(minimumBid)} · Available bidding limit {formatPrice(maximumBid)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={decrease}
            disabled={biddingDisabled || bidAmount <= minimumBid}
            aria-label={`Decrease bid by ${formatPrice(increment)}`}
          >
            <Minus aria-hidden="true" className="size-4" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={increase}
            disabled={biddingDisabled || bidAmount >= maximumBid}
            aria-label={`Increase bid by ${formatPrice(increment)}`}
          >
            <Plus aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <Button
        type="button"
        className="mt-5 w-full"
        disabled={biddingDisabled}
        onClick={() => onBid(bidAmount)}
      >
        <Gavel aria-hidden="true" className="size-4" />
        {submitting ? 'Submitting bid…' : `Place bid · ${formatPrice(bidAmount)}`}
      </Button>

      <p
        className={
          budgetInsufficient
            ? 'mt-3 text-center text-xs font-bold text-danger'
            : 'mt-3 text-center text-xs text-muted'
        }
      >
        {budgetInsufficient
          ? 'Insufficient available budget for the minimum bid.'
          : 'The server validates the amount, wallet, auction version, and winning bidder.'}
      </p>
    </div>
  );
}
