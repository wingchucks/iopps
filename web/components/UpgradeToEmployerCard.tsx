'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getEmployerProfile } from '@/lib/firestore';
import {
  BuildingOffice2Icon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const INTENT_OPTIONS = [
  { value: '', label: 'Select your primary intent...' },
  { value: 'post_jobs', label: 'Post job opportunities' },
  { value: 'list_school', label: 'List a school or education institution' },
  { value: 'list_business', label: 'List a business on Shop Indigenous' },
  { value: 'post_events', label: 'Post conferences and events' },
  { value: 'multiple', label: 'Multiple of the above' },
];

interface UpgradeToEmployerCardProps {
  onSuccess?: () => void;
}

export default function UpgradeToEmployerCard({ onSuccess }: UpgradeToEmployerCardProps) {
  const { user } = useAuth();
  const [organizationName, setOrganizationName] = useState('');
  const [description, setDescription] = useState('');
  const [intent, setIntent] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [existingStatus, setExistingStatus] = useState<'pending' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check for existing employer application on mount
  useEffect(() => {
    async function checkExistingApplication() {
      if (!user) {
        setCheckingStatus(false);
        return;
      }
      try {
        const employer = await getEmployerProfile(user.uid);
        if (employer) {
          if (employer.status === 'pending') {
            setExistingStatus('pending');
          } else if (employer.status === 'rejected') {
            setExistingStatus('rejected');
          }
        }
      } catch (err) {
        console.error('Error checking employer status:', err);
      } finally {
        setCheckingStatus(false);
      }
    }
    checkExistingApplication();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !organizationName.trim()) return;

    // Validate description length
    if (description.trim().length < 50) {
      setError('Please provide a description of at least 50 characters');
      return;
    }

    // Validate intent selection
    if (!intent) {
      setError('Please select what you plan to do with your employer account');
      return;
    }

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
          intent,
          website: website.trim() || undefined,
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

  // Show loading state while checking for existing application
  if (checkingStatus) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal-400 border-t-transparent" />
          </div>
          <p className="mt-4 text-[var(--text-muted)]">Checking application status...</p>
        </div>
      </div>
    );
  }

  // Show existing pending application state
  if (existingStatus === 'pending') {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <ClockIcon className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Application Under Review</h2>
          <p className="mt-2 text-[var(--text-muted)]">
            Your employer application is currently being reviewed by our team.
          </p>
          <p className="mt-4 text-sm text-foreground0">
            We typically review applications within 1-2 business days. You&apos;ll receive an email once approved.
          </p>
        </div>
      </div>
    );
  }

  // Show rejected application state
  if (existingStatus === 'rejected') {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
            <XCircleIcon className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Application Not Approved</h2>
          <p className="mt-2 text-[var(--text-muted)]">
            Unfortunately, your previous application was not approved.
          </p>
          <p className="mt-4 text-sm text-foreground0">
            If you believe this was in error or would like to discuss your application, please contact us at{' '}
            <a href="mailto:support@iopps.ca" className="text-accent hover:underline">
              support@iopps.ca
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20">
            <ClockIcon className="h-8 w-8 text-amber-400" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">Application Submitted!</h2>
          <p className="mt-2 text-[var(--text-muted)]">
            Thank you for your interest in becoming an employer on IOPPS. Your application is now under review.
          </p>
          <p className="mt-4 text-sm text-foreground0">
            We typically review applications within 1-2 business days. You&apos;ll receive an email once approved.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-[var(--card-border)] bg-surface p-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20">
            <BuildingOffice2Icon className="h-8 w-8 text-accent" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-white">
            Upgrade to Employer Account
          </h2>
          <p className="mt-2 text-[var(--text-muted)]">
            To list your business on Shop Indigenous, you need an employer account.
            Upgrade now using your existing login.
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 rounded-xl bg-surface p-4">
          <p className="text-sm font-medium text-[var(--text-secondary)]">With an employer account you can:</p>
          <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-accent" />
              List your business on Shop Indigenous
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-accent" />
              Post job opportunities
            </li>
            <li className="flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-accent" />
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
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Organization / Business Name *
            </label>
            <input
              type="text"
              required
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Your business or organization name"
              className="w-full rounded-lg bg-slate-700 border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              What do you plan to do? *
            </label>
            <select
              required
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              className="w-full rounded-lg bg-slate-700 border border-[var(--card-border)] px-4 py-3 text-white focus:border-accent focus:outline-none"
            >
              {INTENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description *
              <span className="ml-2 text-xs text-foreground0">
                (min 50 characters, {description.length}/50)
              </span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about your organization, what you do, and how you serve Indigenous communities..."
              className="w-full rounded-lg bg-slate-700 border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Website
              <span className="ml-2 text-xs text-foreground0">(optional)</span>
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              className="w-full rounded-lg bg-slate-700 border border-[var(--card-border)] px-4 py-3 text-white placeholder-slate-400 focus:border-accent focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !organizationName.trim() || !intent || description.trim().length < 50}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>
                Submit Application
                <ArrowRightIcon className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {/* Note */}
        <p className="mt-4 text-center text-xs text-foreground0">
          Your existing profile and saved jobs will be preserved.
        </p>
      </div>
    </div>
  );
}
