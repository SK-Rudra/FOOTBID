import type { Metadata } from 'next';
import { FormationCatalog } from '@/components/formations/formation-catalog';
import { SiteHeader } from '@/components/layout/site-header';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Formation Database | KickoffBid',
  description:
    'Compare KickoffBid formation shapes, tactical styles, intensity settings, values, and squad bonuses.',
};

export default function FormationsPage() {
  return (
    <div className="min-h-dvh overflow-hidden">
      <SiteHeader />

      <main className="relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_15%_10%,rgba(183,243,74,0.13),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(60,209,255,0.09),transparent_30%)]" />

        <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Badge tone="accent">Phase 9 / Formation auction</Badge>

          <div className="mt-5 max-w-3xl">
            <h1 className="text-4xl font-black tracking-[-0.055em] text-foreground sm:text-6xl">
              Shape every phase of play.
              <span className="block text-accent">Bid for your tactical system.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Compare seven auctionable tactical shapes and the shared basic fallback. Every premium
              formation offers a balanced four-point bonus profile without overpowering player
              quality.
            </p>
          </div>

          <div className="mt-10">
            <FormationCatalog />
          </div>
        </section>
      </main>
    </div>
  );
}
