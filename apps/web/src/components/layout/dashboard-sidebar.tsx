'use client';

import {
  Gavel,
  LayoutDashboard,
  LockKeyhole,
  Search,
  Settings,
  Trophy,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FootbidLogo } from '@/components/brand/footbid-logo';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NavigationItem {
  label: string;
  icon: LucideIcon;
  href?: string;
  mobile?: boolean;
}

const navigation: NavigationItem[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    href: '/dashboard',
    mobile: true,
  },
  {
    label: 'Players',
    icon: Search,
    href: '/players',
    mobile: true,
  },
  {
    label: 'Wallet',
    icon: WalletCards,
    href: '/wallet',
    mobile: true,
  },
  {
    label: 'Squad',
    icon: UsersRound,
  },
  {
    label: 'Auction room',
    icon: Gavel,
    href: '/auctions',
    mobile: true,
  },
  {
    label: 'Leaderboard',
    icon: Trophy,
  },
  {
    label: 'Settings',
    icon: Settings,
  },
];

interface DashboardSidebarProps {
  displayName: string;
  email: string;
}

function SidebarItem({
  item,
  active,
  compact = false,
}: {
  item: NavigationItem;
  active: boolean;
  compact?: boolean;
}) {
  const Icon = item.icon;

  const content = (
    <>
      <Icon aria-hidden="true" className="size-5 shrink-0" />

      {compact ? (
        <span>{item.label}</span>
      ) : (
        <>
          <span className="flex-1">{item.label}</span>

          {!item.href && <LockKeyhole aria-hidden="true" className="size-3.5 opacity-55" />}
        </>
      )}
    </>
  );

  const className = cn(
    'flex items-center gap-3 rounded-xl text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    compact ? 'min-w-16 flex-col justify-center gap-1 px-2 py-2 text-[0.625rem]' : 'px-3.5 py-3',
    active ? 'bg-accent/12 text-accent' : 'text-muted hover:bg-white/[0.055] hover:text-foreground',
    !item.href && 'cursor-not-allowed opacity-55',
  );

  if (!item.href) {
    return (
      <span className={className} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} className={className} aria-current={active ? 'page' : undefined}>
      {content}
    </Link>
  );
}

export function DashboardSidebar({ displayName, email }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-70 shrink-0 flex-col border-r border-line bg-[#070b12]/95 px-4 py-5 backdrop-blur-xl lg:flex">
        <Link
          href="/"
          aria-label="KickoffBid home"
          className="rounded-xl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <FootbidLogo />
        </Link>

        <div className="mt-8 px-2">
          <Badge tone="accent">Pre-season</Badge>

          <p className="mt-3 text-xs leading-5 text-muted">
            Secure wallets and live player auctions are online.
          </p>
        </div>

        <nav aria-label="Dashboard navigation" className="mt-7 flex flex-1 flex-col gap-1">
          {navigation.map((item) => (
            <SidebarItem key={item.label} item={item} active={item.href === pathname} />
          ))}
        </nav>

        <div className="rounded-2xl border border-line bg-white/[0.035] p-4">
          <p className="truncate text-sm font-extrabold text-foreground">{displayName}</p>

          <p className="mt-1 truncate text-xs text-muted">{email}</p>
        </div>
      </aside>

      <nav
        aria-label="Mobile dashboard navigation"
        className="fixed right-3 bottom-3 left-3 z-40 flex items-center justify-around rounded-2xl border border-line-strong bg-surface/92 p-1.5 shadow-[0_20px_70px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:hidden"
      >
        {navigation
          .filter((item) => item.mobile)
          .map((item) => (
            <SidebarItem key={item.label} item={item} active={item.href === pathname} compact />
          ))}
      </nav>
    </>
  );
}
