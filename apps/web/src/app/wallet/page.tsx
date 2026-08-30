import type { Metadata } from 'next';
import { WalletView } from '@/components/wallet/wallet-view';

export const metadata: Metadata = {
  title: 'Match wallet',
  description: 'View your secure FOOTBID match budget and immutable transaction history.',
};

export default function WalletPage() {
  return <WalletView />;
}
