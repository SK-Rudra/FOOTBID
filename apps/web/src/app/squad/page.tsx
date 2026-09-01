import type { Metadata } from 'next';
import { SquadBuilderView } from '@/components/squads/squad-builder-view';

export const metadata: Metadata = {
  title: 'Squad builder',
  description: 'Build, save, and securely lock your private KickoffBid match squad.',
};

export default function SquadPage() {
  return <SquadBuilderView />;
}
