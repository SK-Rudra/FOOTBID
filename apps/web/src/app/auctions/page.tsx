import type { Metadata } from 'next';
import { AuctionRoomView } from '@/components/auctions/auction-room-view';

export const metadata: Metadata = {
  title: 'Live auction room',
  description:
    'Join secure real-time KickoffBid player and manager auctions with server-authoritative bids.',
};

export default function AuctionsPage() {
  return <AuctionRoomView />;
}
