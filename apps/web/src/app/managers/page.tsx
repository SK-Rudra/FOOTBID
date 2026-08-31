import type { Metadata } from 'next';
import { SiteHeader } from '@/components/layout/site-header';
import { ManagerCatalog } from '@/components/managers/manager-catalog';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Manager Database | KickoffBid',
  description:
    'Compare auctionable KickoffBid managers, tactical styles, formations, ratings, and bonuses.',
};

export default function ManagersPage() {
  return (
    <div className="min-h-dvh overflow-hidden">
      <SiteHeader />

      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_15%_10%,rgba(60,209,255,0.12),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(183,243,74,0.1),transparent_30%)]" />

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Badge tone="info">Phase 8 / Manager auction</Badge>

          <div className="mt-5 max-w-3xl">
            <h1 className="text-4xl font-black tracking-[-0.055em] text-foreground sm:text-6xl">
              Choose your football identity.
              <span className="block text-info">Bid for the right manager.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Compare tactical styles, preferred formations, philosophies, ratings, and squad
              bonuses before entering the live auction room.
            </p>
          </div>

          <div className="mt-10">
            <ManagerCatalog />
          </div>
        </section>
      </main>
    </div>
  );
}
