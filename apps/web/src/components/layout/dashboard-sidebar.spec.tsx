import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardSidebar } from './dashboard-sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

describe('DashboardSidebar', () => {
  it('gives desktop and mobile navigation items visible names', () => {
    render(<DashboardSidebar displayName="Manager One" email="manager@footbid.test" />);

    const overviewLinks = screen.getAllByRole('link', {
      name: 'Overview',
    });

    expect(overviewLinks).toHaveLength(2);

    for (const link of overviewLinks) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }

    expect(screen.getAllByText('Auction room')).toHaveLength(2);
  });
});
