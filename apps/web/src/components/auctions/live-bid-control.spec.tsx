import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LiveBidControl } from './live-bid-control';

describe('LiveBidControl', () => {
  it('adjusts a bid within the server-provided limits', async () => {
    const interaction = userEvent.setup();
    const onBid = vi.fn();

    const { rerender } = render(
      <LiveBidControl
        minimumBid={11_000_000}
        maximumBid={13_000_000}
        increment={1_000_000}
        onBid={onBid}
      />,
    );

    const increaseButton = screen.getByRole('button', {
      name: /increase bid/i,
    });

    await interaction.click(increaseButton);
    await interaction.click(increaseButton);

    expect(increaseButton).toBeDisabled();

    await interaction.click(
      screen.getByRole('button', {
        name: /place bid/i,
      }),
    );

    expect(onBid).toHaveBeenCalledWith(13_000_000);

    rerender(
      <LiveBidControl
        minimumBid={14_000_000}
        maximumBid={15_000_000}
        increment={1_000_000}
        onBid={onBid}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: /place bid.*14m/i,
      }),
    ).toBeInTheDocument();
  });

  it('blocks bidding when the wallet cannot cover the minimum', () => {
    render(
      <LiveBidControl
        minimumBid={20_000_000}
        maximumBid={19_000_000}
        increment={1_000_000}
        onBid={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', {
        name: /place bid/i,
      }),
    ).toBeDisabled();

    expect(screen.getByText(/insufficient available budget/i)).toBeInTheDocument();
  });
});
