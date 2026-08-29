import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import { RegisterForm } from './register-form';

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}));

describe('RegisterForm', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('blocks invalid registration data locally', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <RegisterForm />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText('Display name'), 'R');
    await user.type(screen.getByLabelText('Username'), 'Bad Name');
    await user.type(screen.getByLabelText('Email address'), 'invalid-email');
    await user.type(screen.getByLabelText('Password'), 'weak');
    await user.type(screen.getByLabelText('Confirm password'), 'different');

    await user.click(
      screen.getByRole('button', {
        name: 'Create manager account',
      }),
    );

    expect(screen.getByText('Display name must contain 2–80 characters.')).toBeInTheDocument();

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();

    expect(screen.getByText('The passwords do not match.')).toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
