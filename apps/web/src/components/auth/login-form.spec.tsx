import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '@/components/ui/toast';
import { LoginForm } from './login-form';

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMocks,
}));

describe('LoginForm', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('rejects an empty form before making a request', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <LoginForm />
      </ToastProvider>,
    );

    await user.click(
      screen.getByRole('button', {
        name: 'Sign in',
      }),
    );

    expect(screen.getByText('Enter your email address or username.')).toBeInTheDocument();

    expect(screen.getByText('Enter your password.')).toBeInTheDocument();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('signs in and navigates to the dashboard', async () => {
    const user = userEvent.setup();

    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          user: {
            id: 'user-1',
            email: 'manager@footbid.test',
            username: 'manager_one',
            displayName: 'Manager One',
            avatarUrl: null,
            role: 'USER',
            status: 'ACTIVE',
            lastSeenAt: null,
            createdAt: '2026-08-29T08:00:00.000Z',
            updatedAt: '2026-08-29T08:00:00.000Z',
          },
          accessTokenExpiresAt: '2026-08-29T08:15:00.000Z',
          refreshTokenExpiresAt: '2026-09-05T08:00:00.000Z',
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      ),
    );

    render(
      <ToastProvider>
        <LoginForm />
      </ToastProvider>,
    );

    await user.type(screen.getByLabelText('Email or username'), 'manager_one');

    await user.type(screen.getByLabelText('Password'), 'FootbidPassword1');

    await user.click(
      screen.getByRole('button', {
        name: 'Sign in',
      }),
    );

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith('/dashboard');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/auth\/login$/),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );

    expect(screen.getByText('Welcome back, Manager One')).toBeInTheDocument();
  });
});
