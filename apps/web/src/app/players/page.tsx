import type { Metadata } from 'next';
import { PlayerCatalog } from '@/components/players/player-catalog';
import { SiteHeader } from '@/components/layout/site-header';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Player Database | KickoffBid',
  description: 'Search and compare the active fictional player database used by KickoffBid.',
};

export default function PlayersPage() {
  return (
    <div className="min-h-dvh overflow-hidden">
      <SiteHeader />

      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_15%_10%,rgba(183,243,74,0.12),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(60,209,255,0.1),transparent_30%)]" />

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Badge tone="accent">Phase 5 · Player database</Badge>

          <div className="mt-5 max-w-3xl">
            <h1 className="text-4xl font-black tracking-[-0.055em] text-foreground sm:text-6xl">
              Scout every attribute.
              <span className="block text-accent">Build your shortlist.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Search, filter, sort and inspect the fictional player pool. The catalog is ready for
              properly licensed datasets later, without depending on official photographs or
              branding.
            </p>
          </div>

          <div className="mt-10">
            <PlayerCatalog />
          </div>
        </section>
      </main>
    </div>
  );
}
