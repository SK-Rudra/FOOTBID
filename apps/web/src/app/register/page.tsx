import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create your secure KickoffBid manager identity.',
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="New manager"
      title="Create your KickoffBid identity."
      description="Set up the account that will carry your squads, match history, and ranking."
      footer={
        <p>
          Already registered?{' '}
          <Link href="/login" className="font-extrabold text-accent hover:text-accent-strong">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthShell>
  );
}
