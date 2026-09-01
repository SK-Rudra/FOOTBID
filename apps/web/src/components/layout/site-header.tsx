'use client';

import { Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { FootbidLogo } from '@/components/brand/footbid-logo';
import { buttonVariants, Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

const navigation = [
  { label: 'Players', href: '/players' },
  { label: 'Managers', href: '/managers' },
  { label: 'Formations', href: '/formations' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Game format', href: '/#game-format' },
  { label: 'Design system', href: '/#experience' },
];

export function SiteHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/82 backdrop-blur-xl">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
      >
        <Link
          href="/"
          aria-label="KickoffBid home"
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <FootbidLogo />
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold text-muted transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Link
            href="/login"
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
            })}
          >
            Sign in
          </Link>

          <Link
            href="/register"
            className={buttonVariants({
              size: 'sm',
            })}
          >
            Create account
          </Link>
        </div>

        <div className="sm:hidden">
          <Modal
            title="Navigate KickoffBid"
            description="Explore the platform or access your account."
            open={mobileMenuOpen}
            onOpenChange={setMobileMenuOpen}
            trigger={
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Open navigation menu"
              >
                <Menu aria-hidden="true" className="size-5" />
              </Button>
            }
          >
            <div className="flex flex-col gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-bold text-muted transition hover:bg-white/[0.06] hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}

              <div className="my-2 h-px bg-line" />

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className={buttonVariants({
                  variant: 'secondary',
                  className: 'w-full',
                })}
              >
                Sign in
              </Link>

              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className={buttonVariants({
                  className: 'w-full',
                })}
              >
                Create account
              </Link>
            </div>
          </Modal>
        </div>
      </nav>
    </header>
  );
}
