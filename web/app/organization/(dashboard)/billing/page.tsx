'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getEmployerProfile, getEnabledModules, getVendorProfile } from '@/lib/firestore';
import type { EmployerProfile, OrganizationModule, Vendor } from '@/lib/types';
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  BriefcaseIcon,
  ShoppingBagIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  DocumentTextIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface PaymentRecord {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string | null;
  receiptUrl: string | null;
  invoiceUrl: string | null;
}

interface PlanCardProps {
  module: string;
  name: string;
  icon: React.ElementType;
  status: 'active' | 'inactive' | 'expired';
  details?: string;
  expiresAt?: Date | null;
  upgradeHref: string;
  color: 'blue' | 'teal' | 'amber' | 'purple';
  startingPrice?: string;
}

function PlanCard({ module, name, icon: Icon, status, details, expiresAt, upgradeHref, color, startingPrice }: PlanCardProps) {
  const colorClasses = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    teal: 'border-accent/20 bg-accent/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
  };

  const iconColors = {
    blue: 'text-blue-400',
    teal: 'text-accent',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
  };

  return (
    <div className={`border rounded-2xl p-5 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl bg-slate-900/50 ${iconColors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">{name}</h3>
            <p className="text-sm text-slate-500">{module}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {status === 'active' ? (
            <>
              <CheckCircleIcon className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">Active</span>
            </>
          ) : status === 'expired' ? (
            <>
              <XCircleIcon className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-400">Expired</span>
            </>
          ) : (
            <>
              <XCircleIcon className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500">Inactive</span>
            </>
          )}
        </div>
      </div>

      {details && (
        <p className="text-sm text-slate-400 mb-3">{details}</p>
      )}

      {expiresAt && status === 'active' && (
        <p className="text-xs text-slate-500 mb-3">
          Expires: {format(expiresAt, 'MMMM d, yyyy')}
        </p>
      )}

      <Link
        href={upgradeHref}
        className="inline-flex items-center gap-2 text-sm text-accent hover:text-accent/80 transition-colors"
      >
        {status === 'active' ? 'Manage' : (
          <>
            View Pricing{startingPrice && ` — ${startingPrice}`}
          </>
        )}
        <ArrowRightIcon className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [enabledModules, setEnabledModules] = useState<OrganizationModule[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const openBillingPortal = async () => {
    if (!user) return;

    try {
      setPortalLoading(true);
      const token = await user.getIdToken();
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      } else {
        console.error('Failed to create portal session');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    async function loadBillingData() {
      if (!user) return;

      try {
        const [employerProfile, modules, vendorProfile] = await Promise.all([
          getEmployerProfile(user.uid),
          getEnabledModules(user.uid),
          getVendorProfile(user.uid),
        ]);

        setProfile(employerProfile);
        setEnabledModules(modules);
        setVendor(vendorProfile);
      } catch (error) {
        console.error('Error loading billing data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadBillingData();
  }, [user]);

  // Fetch payment history
  useEffect(() => {
    async function loadPaymentHistory() {
      if (!user) return;

      try {
        setPaymentsLoading(true);
        const token = await user.getIdToken();
        const response = await fetch('/api/billing/payments', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setPayments(data.payments || []);
        }
      } catch (error) {
        console.error('Error loading payment history:', error);
      } finally {
        setPaymentsLoading(false);
      }
    }

    loadPaymentHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Determine subscription statuses
  const hireStatus = profile?.subscription?.active ? 'active' : 'inactive';
  const hireExpires = profile?.subscription?.expiresAt
    ? (profile.subscription.expiresAt instanceof Date
        ? profile.subscription.expiresAt
        : profile.subscription.expiresAt.toDate())
    : null;

  const sellStatus = vendor?.subscriptionStatus === 'active' ? 'active' : 'inactive';
  const sellExpires = vendor?.subscriptionEndsAt
    ? (vendor.subscriptionEndsAt instanceof Date
        ? vendor.subscriptionEndsAt
        : vendor.subscriptionEndsAt.toDate())
    : null;

  // Calculate remaining credits
  const jobCreditsRemaining = profile?.subscription
    ? (profile.subscription.unlimitedPosts
        ? 'Unlimited'
        : `${profile.subscription.jobCredits - profile.subscription.jobCreditsUsed} remaining`)
    : 'No plan';

  const featuredCreditsRemaining = profile?.subscription
    ? `${profile.subscription.featuredJobCredits - profile.subscription.featuredJobCreditsUsed} remaining`
    : 'No plan';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Pricing</h1>
        <p className="text-slate-400 mt-1">
          View pricing options and manage your subscriptions
        </p>
      </div>

      {/* Overview Card */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CreditCardIcon className="w-6 h-6 text-accent" />
            <h2 className="text-lg font-semibold text-slate-50">Subscription Overview</h2>
          </div>
          {(profile?.subscription?.active || vendor?.subscriptionStatus === 'active') && (
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {portalLoading ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <CreditCardIcon className="w-4 h-4" />
              )}
              Manage Billing
            </button>
          )}
        </div>

        {profile?.subscription?.active ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">Current Tier</p>
              <p className="text-xl font-bold text-accent">
                {profile.subscription.tier === 'TIER2' ? 'Partner' : 'Starter'}
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">Job Credits</p>
              <p className="text-xl font-bold text-slate-200">{jobCreditsRemaining}</p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4">
              <p className="text-sm text-slate-500 mb-1">Featured Credits</p>
              <p className="text-xl font-bold text-slate-200">{featuredCreditsRemaining}</p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/30 rounded-xl p-6 text-center">
            <SparklesIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-4">No active subscription</p>
            <Link
              href="/pricing#employers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
            >
              View Pricing Plans
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>

      {/* Module Plans */}
      <div>
        <h2 className="text-lg font-semibold text-slate-50 mb-4">Module Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hire Plan */}
          {enabledModules.includes('hire') && (
            <PlanCard
              module="Hire Module"
              name={profile?.subscription?.tier === 'TIER2' ? 'Partner Plan' : 'Starter Plan'}
              icon={BriefcaseIcon}
              status={hireStatus}
              details={hireStatus === 'active' ? jobCreditsRemaining : 'Post jobs and find talent'}
              expiresAt={hireExpires}
              upgradeHref="/pricing#employers"
              color="blue"
              startingPrice="from $125"
            />
          )}

          {/* Sell Plan */}
          {enabledModules.includes('sell') && (
            <PlanCard
              module="Sell Module"
              name={sellStatus === 'active' ? 'Shop Indigenous' : 'Shop Indigenous'}
              icon={ShoppingBagIcon}
              status={sellStatus}
              details={sellStatus === 'active' ? 'Your business is visible' : 'Showcase your Indigenous business'}
              expiresAt={sellExpires}
              upgradeHref="/pricing#vendors"
              color="teal"
              startingPrice="from $50/mo"
            />
          )}

          {/* Host Plan - Free */}
          {enabledModules.includes('host') && (
            <PlanCard
              module="Host Module"
              name="Free Listing"
              icon={CalendarDaysIcon}
              status="active"
              details="Post conferences and events for free"
              upgradeHref="/organization/host/conferences"
              color="amber"
            />
          )}

          {/* Educate Plan */}
          {enabledModules.includes('educate') && (
            <PlanCard
              module="Educate Module"
              name="Education Provider"
              icon={AcademicCapIcon}
              status="active"
              details="Manage programs and scholarships"
              upgradeHref="/organization/educate/profile"
              color="purple"
            />
          )}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-card border border-card-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <DocumentTextIcon className="w-6 h-6 text-accent" />
          <h2 className="text-lg font-semibold text-slate-50">Payment History</h2>
        </div>

        {paymentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <DocumentTextIcon className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p>No payments yet</p>
            <p className="text-sm mt-1">
              Your payment history will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-400">Description</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400">Amount</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-400">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-slate-400"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-800/50 hover:bg-slate-900/30">
                    <td className="py-3 px-4 text-sm text-slate-300">
                      {payment.createdAt
                        ? format(new Date(payment.createdAt), 'MMM d, yyyy')
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm text-slate-200">{payment.description}</p>
                      <p className="text-xs text-slate-500 capitalize">{payment.type.replace('_', ' ')}</p>
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-slate-200">
                      ${((payment.amount || 0) / 100).toFixed(2)} {payment.currency?.toUpperCase()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'succeeded'
                          ? 'bg-green-500/10 text-green-400'
                          : payment.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {payment.status === 'succeeded' && <CheckCircleIcon className="w-3 h-3" />}
                        {payment.status === 'succeeded' ? 'Paid' : payment.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {payment.receiptUrl && (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80"
                        >
                          Receipt
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-slate-300 font-medium">Need help with billing?</p>
          <p className="text-sm text-slate-500">Contact our support team</p>
        </div>
        <Link
          href="/contact"
          className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
