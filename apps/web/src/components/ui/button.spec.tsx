import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders an accessible button', () => {
    render(<Button>Enter auction</Button>);

    expect(
      screen.getByRole('button', {
        name: 'Enter auction',
      }),
    ).toBeInTheDocument();
  });

  it('supports the native disabled state', () => {
    render(
      <Button variant="secondary" disabled>
        Locked
      </Button>,
    );

    expect(
      screen.getByRole('button', {
        name: 'Locked',
      }),
    ).toBeDisabled();
  });
});
