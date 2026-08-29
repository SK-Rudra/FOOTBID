import { Gavel, Radio, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CountdownTimer } from '@/components/ui/countdown-timer';

interface AuctionLotCardProps {
  playerName: string;
  position: string;
  overall: number;
  currentBidMillions: number;
  participantCount: number;
  targetTime: string | number;
  action?: ReactNode;
}

export function AuctionLotCard({
  playerName,
  position,
  overall,
  currentBidMillions,
  participantCount,
  targetTime,
  action,
}: AuctionLotCardProps) {
  return (
    <Card tone="accent" className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <Badge tone="danger" className="gap-1.5">
            <Radio aria-hidden="true" className="size-3 animate-soft-pulse" />
            Live lot
          </Badge>

          <CardTitle className="mt-4">{playerName}</CardTitle>

          <p className="mt-1 text-sm text-muted">
            {overall} OVR · {position}
          </p>
        </div>

        <span className="grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/10 text-accent">
          <Gavel aria-hidden="true" className="size-5" />
        </span>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-black/20 p-3">
            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.14em] text-muted">
              Current bid
            </p>
            <p className="mt-2 font-mono text-xl font-black text-accent">€{currentBidMillions}M</p>
          </div>

          <div className="rounded-xl border border-line bg-black/20 p-3">
            <p className="text-[0.625rem] font-extrabold uppercase tracking-[0.14em] text-muted">
              Managers
            </p>
            <p className="mt-2 flex items-center gap-2 font-mono text-xl font-black text-foreground">
              <UsersRound aria-hidden="true" className="size-4 text-info" />
              {participantCount}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <CountdownTimer targetTime={targetTime} />
          {action}
        </div>
      </CardContent>
    </Card>
  );
}
