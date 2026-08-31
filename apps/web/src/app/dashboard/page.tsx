import type { Metadata } from 'next';
import { DashboardView } from '@/components/dashboard/dashboard-view';

export const metadata: Metadata = {
  title: 'Manager dashboard',
  description: 'Manage your secure KickoffBid identity and view game-system previews.',
};

export default function DashboardPage() {
  return <DashboardView />;
}
