'use client';

import { LoaderCircle, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { apiRequest, ApiRequestError, type AuthenticationResponse } from '@/lib/api-client';
import { PasswordInput } from './password-input';

interface LoginErrors {
  identifier?: string;
  password?: string;
}

export function LoginForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): LoginErrors => {
    const nextErrors: LoginErrors = {};

    if (identifier.trim().length < 3) {
      nextErrors.identifier = 'Enter your email address or username.';
    }

    if (!password) {
      nextErrors.password = 'Enter your password.';
    }

    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    setRequestError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiRequest<AuthenticationResponse>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: identifier.trim().toLowerCase(),
          password,
        }),
      });

      showToast({
        title: `Welcome back, ${result.user.displayName}`,
        description: 'Your secure KickoffBid session is active.',
        tone: 'success',
      });

      router.replace('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Unable to connect to KickoffBid. Check that the API is running.';

      setRequestError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <FormField label="Email or username" htmlFor="identifier" error={errors.identifier} required>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          hasError={Boolean(errors.identifier)}
          aria-describedby={errors.identifier ? 'identifier-message' : undefined}
          placeholder="manager@example.com"
          disabled={submitting}
        />
      </FormField>

      <FormField label="Password" htmlFor="password" error={errors.password} required>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hasError={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-message' : undefined}
          placeholder="Enter your password"
          disabled={submitting}
        />
      </FormField>

      {requestError && (
        <div
          role="alert"
          className="rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-3 text-sm leading-6 text-danger"
        >
          {requestError}
        </div>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <LogIn aria-hidden="true" className="size-4" />
        )}

        {submitting ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
