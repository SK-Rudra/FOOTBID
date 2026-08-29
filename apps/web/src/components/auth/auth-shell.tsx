import { Gavel, ShieldCheck, Swords } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FootbidLogo } from '@/components/brand/footbid-logo';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}

const principles = [
  {
    icon: Gavel,
    title: 'Read the market',
    description: 'Build value while your opponent chases headlines.',
  },
  {
    icon: ShieldCheck,
    title: 'Protected sessions',
    description: 'Secure HttpOnly authentication with server-side revocation.',
  },
  {
    icon: Swords,
    title: 'Prepare to compete',
    description: 'Your identity carries into every future FOOTBID match.',
  },
];

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="stadium-glow relative min-h-dvh overflow-hidden">
      <div aria-hidden="true" className="pitch-grid absolute inset-0 opacity-65" />

      <div className="relative mx-auto grid min-h-dvh w-full max-w-7xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden flex-col justify-between border-r border-line p-10 lg:flex xl:p-14">
          <Link
            href="/"
            aria-label="Return to FOOTBID home"
            className="w-fit rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <FootbidLogo />
          </Link>

          <div className="max-w-lg">
            <Badge tone="accent">Manager access</Badge>

            <h2 className="text-balance mt-5 text-5xl leading-[0.95] font-black tracking-[-0.06em]">
              Build your identity before you build your eleven.
            </h2>

            <div className="mt-10 space-y-5">
              {principles.map((principle) => {
                const Icon = principle.icon;

                return (
                  <div key={principle.title} className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-white/[0.045] text-accent">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>

                    <div>
                      <h3 className="text-sm font-extrabold">{principle.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted">{principle.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted">FOOTBID · Original competitive football strategy</p>
        </section>

        <section className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
          <div className="w-full max-w-lg animate-enter">
            <Link
              href="/"
              aria-label="Return to FOOTBID home"
              className="mb-8 inline-flex rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
            >
              <FootbidLogo />
            </Link>

            <Card tone="glass" className="p-6 sm:p-8">
              <Badge tone="neutral">{eyebrow}</Badge>

              <h1 className="text-balance mt-5 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
                {title}
              </h1>

              <p className="mt-3 text-sm leading-6 text-muted">{description}</p>

              <div className="mt-8">{children}</div>

              <div className="mt-7 border-t border-line pt-6 text-center text-sm text-muted">
                {footer}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
