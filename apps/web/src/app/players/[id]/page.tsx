import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/site-header';
import { PlayerDetailView } from '@/components/players/player-detail-view';

export const metadata: Metadata = {
  title: 'Player Profile | KickoffBid',
  description: 'Review a KickoffBid player profile and its complete core attributes.',
};

interface PlayerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { id } = await params;

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_50%_0%,rgba(183,243,74,0.11),transparent_48%)]" />

        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <PlayerDetailView key={id} playerId={id} />
        </section>
      </main>
    </div>
  );
}
