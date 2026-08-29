'use client';

import { LoaderCircle, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { apiRequest, ApiRequestError, type AuthenticationResponse } from '@/lib/api-client';
import { PasswordInput } from './password-input';

interface RegisterErrors {
  email?: string;
  username?: string;
  displayName?: string;
  password?: string;
  confirmPassword?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[a-z0-9_]{3,32}$/;

function validPassword(password: string): boolean {
  return (
    password.length >= 12 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password)
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): RegisterErrors => {
    const nextErrors: RegisterErrors = {};

    if (!emailPattern.test(email.trim())) {
      nextErrors.email = 'Enter a valid email address.';
    }

    if (!usernamePattern.test(username.trim().toLowerCase())) {
      nextErrors.username = 'Use 3–32 lowercase letters, numbers, or underscores.';
    }

    if (displayName.trim().length < 2 || displayName.trim().length > 80) {
      nextErrors.displayName = 'Display name must contain 2–80 characters.';
    }

    if (!validPassword(password)) {
      nextErrors.password = 'Use at least 12 characters with uppercase, lowercase, and a number.';
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'The passwords do not match.';
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
      const result = await apiRequest<AuthenticationResponse>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
          password,
        }),
      });

      showToast({
        title: `Welcome to FOOTBID, ${result.user.displayName}`,
        description: 'Your manager identity has been created.',
        tone: 'success',
      });

      router.replace('/dashboard');
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : 'Unable to connect to FOOTBID. Check that the API is running.';

      setRequestError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Display name" htmlFor="displayName" error={errors.displayName} required>
          <Input
            id="displayName"
            name="displayName"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            hasError={Boolean(errors.displayName)}
            aria-describedby={errors.displayName ? 'displayName-message' : undefined}
            placeholder="Rudra"
            disabled={submitting}
          />
        </FormField>

        <FormField label="Username" htmlFor="username" error={errors.username} required>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            hasError={Boolean(errors.username)}
            aria-describedby={errors.username ? 'username-message' : undefined}
            placeholder="rudra_manager"
            disabled={submitting}
          />
        </FormField>
      </div>

      <FormField label="Email address" htmlFor="email" error={errors.email} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          hasError={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-message' : undefined}
          placeholder="manager@example.com"
          disabled={submitting}
        />
      </FormField>

      <FormField
        label="Password"
        htmlFor="password"
        hint="At least 12 characters with uppercase, lowercase, and a number."
        error={errors.password}
        required
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hasError={Boolean(errors.password)}
          aria-describedby="password-message"
          placeholder="Create a strong password"
          disabled={submitting}
        />
      </FormField>

      <FormField
        label="Confirm password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword}
        required
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          hasError={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-message' : undefined}
          placeholder="Repeat your password"
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
          <UserPlus aria-hidden="true" className="size-4" />
        )}

        {submitting ? 'Creating manager…' : 'Create manager account'}
      </Button>
    </form>
  );
}
