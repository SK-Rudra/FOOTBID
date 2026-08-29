import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your secure FOOTBID manager account.',
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Return to the touchline."
      description="Sign in with your email address or username to continue."
      footer={
        <p>
          New to FOOTBID?{' '}
          <Link href="/register" className="font-extrabold text-accent hover:text-accent-strong">
            Create an account
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
