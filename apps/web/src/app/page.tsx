import {
  ArrowRight,
  CheckCircle2,
  Crosshair,
  Gavel,
  ShieldCheck,
  Sparkles,
  Swords,
  TimerReset,
  WalletCards,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { AuctionLotCard } from '@/components/game/auction-lot-card';
import { PlayerCard, type PlayerCardData } from '@/components/game/player-card';
import { SiteHeader } from '@/components/layout/site-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ApiHealth {
  status: 'ok';
  service: string;
  database: 'connected';
  timestamp: string;
}

const featuredPlayers: PlayerCardData[] = [
  {
    name: 'Kai Mercer',
    position: 'ST',
    overall: 88,
    club: 'Northbridge Athletic',
    nationality: 'England',
    priceMillions: 34,
    stats: {
      attack: 91,
      control: 86,
      defense: 42,
    },
  },
  {
    name: 'Idris Vela',
    position: 'CM',
    overall: 86,
    club: 'Ciudad Aurora',
    nationality: 'Spain',
    priceMillions: 29,
    stats: {
      attack: 82,
      control: 92,
      defense: 75,
    },
  },
  {
    name: 'Noah Sato',
    position: 'CB',
    overall: 85,
    club: 'Harbor Eleven',
    nationality: 'Japan',
    priceMillions: 25,
    stats: {
      attack: 45,
      control: 78,
      defense: 93,
    },
  },
];

const journey = [
  {
    number: '01',
    title: 'Enter the match',
    description:
      'Join a competitive 1v1 room with equal starting conditions and a shared player pool.',
    icon: Swords,
  },
  {
    number: '02',
    title: 'Win the market',
    description:
      'Read your opponent, protect your budget, and compete for the right players at the right price.',
    icon: Gavel,
  },
  {
    number: '03',
    title: 'Build the edge',
    description:
      'Lock your starting eleven, choose your tactical approach, and settle the contest on the pitch.',
    icon: Crosshair,
  },
];

async function getApiHealth(): Promise<ApiHealth | null> {
  const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

  try {
    const response = await fetch(`${apiUrl}/api/v1/health`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ApiHealth;
  } catch {
    return null;
  }
}

export default async function Home() {
  const health = await getApiHealth();
  const connected = health?.status === 'ok' && health.database === 'connected';

  const previewDeadline = health ? new Date(health.timestamp).getTime() + 5 * 60 * 1000 : 0;

  return (
    <div className="min-h-dvh overflow-hidden">
      <SiteHeader />

      <main>
        <section className="stadium-glow relative isolate border-b border-line">
          <div aria-hidden="true" className="pitch-grid absolute inset-0 -z-10 opacity-70" />

          <div className="mx-auto grid min-h-[calc(100dvh-4.5rem)] w-full max-w-7xl items-center gap-14 px-4 py-18 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:py-24">
            <div className="animate-enter">
              <Badge tone="accent" className="gap-2">
                <Sparkles aria-hidden="true" className="size-3" />
                Competitive football, reimagined
              </Badge>

              <h1 className="text-balance mt-6 max-w-4xl text-[clamp(3.25rem,8vw,7rem)] leading-[0.88] font-black tracking-[-0.075em] text-foreground uppercase">
                Bid.
                <br />
                Build.
                <br />
                <span className="text-accent">Battle.</span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
                FOOTBID is a competitive 1v1 football auction and tactical battle game. Every
                decision costs. Every squad tells a story.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className={buttonVariants({
                    size: 'lg',
                  })}
                >
                  Start building
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>

                <Link
                  href="/#how-it-works"
                  className={buttonVariants({
                    variant: 'secondary',
                    size: 'lg',
                  })}
                >
                  See the format
                </Link>
              </div>

              <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-muted">
                {[
                  'Equal starting conditions',
                  'Server-authoritative rules',
                  'Original fictional presentation',
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div
                aria-hidden="true"
                className="absolute inset-12 rounded-full bg-accent/10 blur-3xl"
              />

              <PlayerCard
                player={featuredPlayers[0]}
                featured
                className="relative mx-auto max-w-sm rotate-[1.5deg] lg:mr-8"
              />

              <Card
                tone="glass"
                className="relative -mt-10 mr-auto max-w-xs -rotate-2 p-4 sm:-mt-20 lg:absolute lg:bottom-12 lg:left-0 lg:mt-0"
              >
                <div className="flex items-center justify-between gap-5">
                  <div>
                    <p className="text-[0.625rem] font-extrabold tracking-[0.16em] text-muted uppercase">
                      Opening bid
                    </p>
                    <p className="mt-1 font-mono text-2xl font-black text-accent">€18M</p>
                  </div>

                  <span className="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Gavel aria-hidden="true" className="size-5" />
                  </span>
                </div>
              </Card>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto w-full max-w-7xl px-4 py-22 sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="max-w-2xl">
            <Badge tone="info">The match journey</Badge>

            <h2 className="text-balance mt-5 text-3xl font-black tracking-[-0.045em] text-foreground sm:text-5xl">
              A football contest decided before and during kick-off.
            </h2>

            <p className="mt-5 text-base leading-7 text-muted">
              Auction discipline and tactical judgment carry equal weight. FOOTBID is designed to
              reward planning instead of luck.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {journey.map((step) => {
              const Icon = step.icon;

              return (
                <Card
                  key={step.number}
                  tone="glass"
                  className="group relative overflow-hidden p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20"
                >
                  <span className="font-mono text-xs font-black tracking-[0.18em] text-accent">
                    {step.number}
                  </span>

                  <span className="mt-8 grid size-12 place-items-center rounded-2xl border border-line bg-white/[0.045] text-foreground transition group-hover:border-accent/25 group-hover:bg-accent/10 group-hover:text-accent">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>

                  <h3 className="mt-6 text-xl font-black tracking-[-0.03em]">{step.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-muted">{step.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="game-format" className="border-y border-line bg-surface/35">
          <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-22 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
            <div className="flex flex-col justify-center">
              <Badge tone="accent" className="w-fit">
                Designed for decisions
              </Badge>

              <h2 className="text-balance mt-5 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
                One budget. Eleven places. No easy choices.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-muted">
                The planned €150M budget system forces every manager to balance stars, specialists,
                and squad structure. That system arrives in a later roadmap phase.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  {
                    icon: WalletCards,
                    title: 'Budget pressure',
                    text: 'Every overbid changes what remains possible.',
                  },
                  {
                    icon: TimerReset,
                    title: 'Live deadlines',
                    text: 'Decisions become harder as the clock falls.',
                  },
                  {
                    icon: ShieldCheck,
                    title: 'Authoritative rules',
                    text: 'Critical game logic stays on the server.',
                  },
                  {
                    icon: Crosshair,
                    title: 'Tactical identity',
                    text: 'Your final eleven must support your plan.',
                  },
                ].map((feature) => {
                  const Icon = feature.icon;

                  return (
                    <div
                      key={feature.title}
                      className="rounded-2xl border border-line bg-black/15 p-4"
                    >
                      <Icon aria-hidden="true" className="size-5 text-accent" />
                      <h3 className="mt-4 text-sm font-extrabold">{feature.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-muted">{feature.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <AuctionLotCard
              playerName="Idris Vela"
              position="CM"
              overall={86}
              currentBidMillions={24}
              participantCount={2}
              targetTime={previewDeadline}
              action={<span className="text-xs font-bold text-muted">Interface preview</span>}
            />
          </div>
        </section>

        <section
          id="experience"
          className="mx-auto w-full max-w-7xl px-4 py-22 sm:px-6 lg:px-8 lg:py-28"
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <Badge tone="neutral">Player presentation</Badge>

              <h2 className="text-balance mt-5 text-3xl font-black tracking-[-0.045em] sm:text-5xl">
                Built for clarity under pressure.
              </h2>

              <p className="mt-5 text-base leading-7 text-muted">
                Original fictional cards keep ratings, roles, attributes, and market guidance
                readable without copying any existing football-game identity.
              </p>
            </div>

            <p className="max-w-xs text-sm leading-6 text-muted">
              Real player-data licensing and imports are separate from this visual-system phase.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPlayers.map((player, index) => (
              <PlayerCard key={player.name} player={player} featured={index === 0} />
            ))}
          </div>
        </section>

        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <Card tone="accent" className="stadium-glow mx-auto max-w-7xl overflow-hidden">
            <CardHeader className="items-center px-6 pt-12 text-center sm:px-10 sm:pt-16">
              <Badge tone="accent">Pre-season access</Badge>

              <CardTitle className="text-balance mt-4 max-w-3xl text-3xl sm:text-5xl">
                Your next winning squad starts with one decision.
              </CardTitle>

              <CardDescription className="mt-3 max-w-xl text-base">
                Create your FOOTBID identity now. Game modules will unlock progressively as the
                roadmap advances.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col items-center gap-3 pb-12 sm:flex-row sm:justify-center sm:pb-16">
              <Link
                href="/register"
                className={buttonVariants({
                  size: 'lg',
                  className: 'w-full sm:w-auto',
                })}
              >
                Create account
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>

              <Link
                href="/login"
                className={buttonVariants({
                  variant: 'secondary',
                  size: 'lg',
                  className: 'w-full sm:w-auto',
                })}
              >
                Sign in
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-line bg-black/20">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-black tracking-[-0.03em]">
              FOOT<span className="text-accent">BID</span>
            </p>
            <p className="mt-1 text-xs text-muted">Original competitive football strategy.</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <span
              className={
                connected
                  ? 'inline-flex items-center gap-2 text-success'
                  : 'inline-flex items-center gap-2 text-warning'
              }
            >
              {connected ? (
                <Wifi aria-hidden="true" className="size-3.5" />
              ) : (
                <WifiOff aria-hidden="true" className="size-3.5" />
              )}
              {connected ? 'API operational' : 'API currently offline'}
            </span>

            <span>© {new Date().getFullYear()} FOOTBID</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
