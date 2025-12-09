'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  BuildingOffice2Icon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface UpgradeToEmployerCardProps {
  onSuccess?: () => void;
}

export default function UpgradeToEmployerCard({ onSuccess }: UpgradeToEmployerCardProps) {
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/auth/upgrade-to-employer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upgrade account');
      }

      setSuccess(true);
      // The AuthProvider will detect the role change via onSnapshot
      // and the page will re-render automatically
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Account Upgraded!</h2>
          <p className="mt-2 text-slate-400">
            Your account has been upgraded to an employer account. You can now list your business.
          </p>
          <p className="mt-4 text-sm text-slate-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20">
            <BuildingOffice2Icon className="h-8 w-8 text-teal-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">
            Upgrade to Employer Account
          </h2>
          <p className="mt-2 text-slate-400">
            To list your business on Shop Indigenous, you need an employer account.
            Upgrade now using your existing login.
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 rounded-xl bg-slate-900/50 p-4">
          <p className="text-sm font-medium text-slate-300">With an employer account you can:</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-teal-400" />
              List your business on Shop Indigenous
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-teal-400" />
              Post job opportunities
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-teal-400" />
              Post conferences and events
            </li>
          </ul>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Organization / Business Name *
            </label>
            <input
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Your business or organization name"
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description (optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your business..."
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-4 py-3 text-white placeholder-slate-400 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !organizationName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Upgrading...
              </>
            ) : (
              <>
                Upgrade Account
                <ArrowRightIcon className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {/* Note */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Your existing profile and saved jobs will be preserved.
        </p>
      </div>
    </div>
  );
}
