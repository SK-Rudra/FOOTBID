import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CountdownTimer } from './countdown-timer';

describe('CountdownTimer', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down without rendering unstable server time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T08:00:00.000Z'));

    render(<CountdownTimer targetTime="2026-08-29T08:01:05.000Z" />);

    expect(screen.getByText('01:05')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('01:00')).toBeInTheDocument();
  });
});
