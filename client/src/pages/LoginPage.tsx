import { useState, type FormEvent } from 'react';

import { useAuth } from '@/context/useAuth';
import type { UserRole } from '@/types/auth';

export function LoginPage({
  onSuccess,
}: {
  onSuccess: (role: UserRole) => void;
}) {
  const { login, error: authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    clearError();
    setIsSubmitting(true);

    try {
      const profile = await login(email.trim(), password);
      onSuccess(profile.role);
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const error = formError ?? authError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 py-12">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            UET Hostel Management
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm text-slate-600">
            Use your university account to continue.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              autoComplete="email"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}