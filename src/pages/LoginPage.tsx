import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.tsx';
import { extractErrorMessage } from '../services/api.ts';
import { useToast } from '../components/Toast.tsx';

export function LoginPage() {
  const { initialized, loadingStatus, login, setupAdmin } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSetupMode = initialized === false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    if (isSetupMode) {
      if (!fullName.trim()) {
        setError('Administrator full name is required.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (isSetupMode) {
        await setupAdmin(fullName.trim(), email.trim(), password);
        showToast('Administrator account created and signed in.', 'success');
      } else {
        await login(email.trim(), password);
        showToast('Signed in successfully.', 'success');
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Authentication failed.');
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
            {isSetupMode ? <ShieldCheck className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Employee Payroll Management System
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {loadingStatus
              ? 'Checking system authentication status...'
              : isSetupMode
                ? 'First-run setup: create the primary administrator account to unlock the payroll database.'
                : 'Sign in with your administrator credentials to manage employees, attendance, and payroll.'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {loadingStatus ? (
            <div className="space-y-4 py-4">
              <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
              <div className="h-10 rounded-lg bg-slate-100 animate-pulse" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {isSetupMode && (
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">
                    Administrator Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Alan Turing"
                    required
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.edu"
                  required
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={isSetupMode ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSetupMode ? 'Minimum 8 characters' : 'Enter your password'}
                  required
                  className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                />
              </div>

              {isSetupMode && (
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:ring-2 focus:ring-blue-700/20"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors disabled:opacity-60"
              >
                {submitting
                  ? 'Authenticating...'
                  : isSetupMode
                    ? 'Create Admin Account & Sign In'
                    : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          MySQL 8+ / MariaDB Normalized Payroll System · Bcrypt &amp; JWT Protected
        </p>
      </div>
    </div>
  );
}
