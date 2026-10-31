'use client';

import { useState, FormEvent } from 'react';

const API_HEALTH_URL = '/api/health';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [healthOk, setHealthOk] = useState<boolean | null>(null);

  async function checkHealth() {
    try {
      const res = await fetch(API_HEALTH_URL);
      setHealthOk(res.ok);
    } catch {
      setHealthOk(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      // Redirect on success -- will be wired up when auth is ready
      window.location.href = '/dashboard';
    } catch {
      setStatus('error');
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight">
            CIT Schedule
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Campus scheduling and room booking system
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="admin@cit.edu"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-red-600">
              Login failed. Check your credentials.
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {status === 'loading' ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="border-t pt-4 text-center text-xs text-gray-500">
          <button
            onClick={checkHealth}
            className="underline hover:text-gray-700"
          >
            Check backend status
          </button>
          {healthOk !== null && (
            <span className="ml-2">
              {healthOk ? (
                <span className="text-green-600">Backend OK</span>
              ) : (
                <span className="text-red-600">Backend unreachable</span>
              )}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
