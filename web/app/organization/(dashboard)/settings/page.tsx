'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
  getEmployerProfile,
  getEnabledModules,
  enableModule,
  disableModule,
} from '@/lib/firestore';
import type { EmployerProfile, OrganizationModule, OrgType } from '@/lib/types';
import { ORG_TYPE_LABELS } from '@/lib/types';
import { getAuth } from 'firebase/auth';
import {
  Cog6ToothIcon,
  BriefcaseIcon,
  ShoppingBagIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  SparklesIcon,
  CheckCircleIcon,
  PlusCircleIcon,
  BellIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

// Badge options for public display
const BADGE_OPTIONS: { value: OrgType | 'AUTO'; label: string }[] = [
  { value: 'AUTO', label: 'Auto-detect based on my modules' },
  { value: 'EMPLOYER', label: 'Employer' },
  { value: 'INDIGENOUS_BUSINESS', label: 'Indigenous Business' },
  { value: 'SCHOOL', label: 'School / College' },
  { value: 'NONPROFIT', label: 'Non-Profit' },
  { value: 'OTHER', label: 'Organization' },
];

const MODULE_INFO: Record<OrganizationModule, {
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}> = {
  hire: {
    name: 'Hire',
    description: 'Post jobs, manage applications, and find Indigenous talent',
    icon: BriefcaseIcon,
    color: 'blue',
  },
  sell: {
    name: 'Sell',
    description: 'Showcase your Indigenous business in the marketplace',
    icon: ShoppingBagIcon,
    color: 'teal',
  },
  educate: {
    name: 'Educate',
    description: 'Manage educational programs and scholarships',
    icon: AcademicCapIcon,
    color: 'purple',
  },
  host: {
    name: 'Host',
    description: 'Create and promote conferences and events',
    icon: CalendarDaysIcon,
    color: 'amber',
  },
  funding: {
    name: 'Funding Opportunities',
    description: 'Share funding opportunities for Indigenous businesses',
    icon: SparklesIcon,
    color: 'pink',
  },
};

type SettingsTab = 'general' | 'modules' | 'notifications';

export default function SettingsPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') as SettingsTab | null;
  const enableModuleParam = searchParams.get('enableModule') as OrganizationModule | null;

  const [profile, setProfile] = useState<EmployerProfile | null>(null);
  const [enabledModules, setEnabledModules] = useState<OrganizationModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab || 'general');
  const [togglingModule, setTogglingModule] = useState<OrganizationModule | null>(null);
  const [badgePreference, setBadgePreference] = useState<OrgType | 'AUTO'>('AUTO');
  const [savingBadge, setSavingBadge] = useState(false);
  const [badgeSuccess, setBadgeSuccess] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;

      try {
        const [employerProfile, modules] = await Promise.all([
          getEmployerProfile(user.uid),
          getEnabledModules(user.uid),
        ]);

        setProfile(employerProfile);
        setEnabledModules(modules);
        setBadgePreference((employerProfile as any)?.badgePreference || 'AUTO');

        // Handle enableModule query param
        if (enableModuleParam && !modules.includes(enableModuleParam)) {
          setActiveTab('modules');
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [user, enableModuleParam]);

  const handleToggleModule = async (module: OrganizationModule) => {
    if (!user) return;

    setTogglingModule(module);
    try {
      if (enabledModules.includes(module)) {
        await disableModule(user.uid, module);
        setEnabledModules(prev => prev.filter(m => m !== module));
      } else {
        await enableModule(user.uid, module);
        setEnabledModules(prev => [...prev, module]);
      }
    } catch (error) {
      console.error('Error toggling module:', error);
    } finally {
      setTogglingModule(null);
    }
  };

  const handleBadgeChange = async (newBadge: OrgType | 'AUTO') => {
    if (!user) return;

    setSavingBadge(true);
    setBadgeSuccess(false);
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');

      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/organization/badge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ badgePreference: newBadge }),
      });

      if (!response.ok) {
        throw new Error('Failed to update badge');
      }

      setBadgePreference(newBadge);
      setBadgeSuccess(true);
      setTimeout(() => setBadgeSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating badge:', error);
    } finally {
      setSavingBadge(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--card-border)] pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'general'
              ? 'bg-accent/10 text-accent'
              : 'text-[var(--text-muted)] hover:text-foreground hover:bg-surface'
          }`}
        >
          <Cog6ToothIcon className="w-4 h-4" />
          General
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'modules'
              ? 'bg-accent/10 text-accent'
              : 'text-[var(--text-muted)] hover:text-foreground hover:bg-surface'
          }`}
        >
          <PlusCircleIcon className="w-4 h-4" />
          Modules
          <span className="px-1.5 py-0.5 text-xs rounded bg-surface">
            {enabledModules.length}/5
          </span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'notifications'
              ? 'bg-accent/10 text-accent'
              : 'text-[var(--text-muted)] hover:text-foreground hover:bg-surface'
          }`}
        >
          <BellIcon className="w-4 h-4" />
          Notifications
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Account Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[var(--card-border)]">
                <div>
                  <p className="text-foreground">Organization ID</p>
                  <p className="text-sm text-foreground0">{profile?.id || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-[var(--card-border)]">
                <div>
                  <p className="text-foreground">Account Status</p>
                  <p className="text-sm text-foreground0">{profile?.status || 'Pending'}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  profile?.status === 'approved'
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-amber-900/30 text-amber-400'
                }`}>
                  {profile?.status || 'Pending'}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-foreground">Member Since</p>
                  <p className="text-sm text-foreground0">
                    {profile?.createdAt
                      ? new Date(
                          profile.createdAt instanceof Date
                            ? profile.createdAt
                            : profile.createdAt.toDate()
                        ).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Public Badge Section */}
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-accent/10 text-accent">
                <TagIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Public Badge</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  How your organization is identified in the directory
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Badge Type
                </label>
                <select
                  value={badgePreference}
                  onChange={(e) => handleBadgeChange(e.target.value as OrgType | 'AUTO')}
                  disabled={savingBadge}
                  className="w-full rounded-xl bg-surface border border-[var(--card-border)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:opacity-50"
                >
                  {BADGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-foreground0">
                  This badge appears on your public profile. It doesn&apos;t affect your features or capabilities.
                </p>
              </div>

              {savingBadge && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              )}

              {badgeSuccess && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircleIcon className="w-4 h-4" />
                  Badge updated successfully
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">Available Modules</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Enable modules to unlock different features for your organization
            </p>

            <div className="space-y-4">
              {(Object.keys(MODULE_INFO) as OrganizationModule[]).map(module => {
                const info = MODULE_INFO[module];
                const Icon = info.icon;
                const isEnabled = enabledModules.includes(module);
                const isToggling = togglingModule === module;

                const colorClasses: Record<string, string> = {
                  blue: 'border-blue-500/20 bg-blue-500/5',
                  teal: 'border-accent/20 bg-accent/5',
                  purple: 'border-purple-500/20 bg-purple-500/5',
                  amber: 'border-amber-500/20 bg-amber-500/5',
                  pink: 'border-pink-500/20 bg-pink-500/5',
                };

                const iconColors: Record<string, string> = {
                  blue: 'text-blue-400',
                  teal: 'text-accent',
                  purple: 'text-purple-400',
                  amber: 'text-amber-400',
                  pink: 'text-pink-400',
                };

                return (
                  <div
                    key={module}
                    className={`border rounded-xl p-4 transition-all ${
                      isEnabled ? colorClasses[info.color] : 'border-[var(--card-border)] bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl bg-surface ${iconColors[info.color]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{info.name}</h3>
                          <p className="text-sm text-foreground0 mt-1">{info.description}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleModule(module)}
                        disabled={isToggling}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isEnabled
                            ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                            : 'bg-surface text-[var(--text-muted)] hover:bg-slate-700'
                        }`}
                      >
                        {isToggling ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isEnabled ? (
                          <>
                            <CheckCircleIcon className="w-4 h-4" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <PlusCircleIcon className="w-4 h-4" />
                            Enable
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Notification Preferences</h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between py-3 border-b border-[var(--card-border)]">
                <div>
                  <p className="text-foreground">New Applications</p>
                  <p className="text-sm text-foreground0">Get notified when someone applies</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={profile?.notificationPreferences?.newApplications !== false}
                  className="w-5 h-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent/50"
                />
              </label>

              <label className="flex items-center justify-between py-3 border-b border-[var(--card-border)]">
                <div>
                  <p className="text-foreground">New Messages</p>
                  <p className="text-sm text-foreground0">Get notified for new inbox messages</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent/50"
                />
              </label>

              <label className="flex items-center justify-between py-3 border-b border-[var(--card-border)]">
                <div>
                  <p className="text-foreground">Weekly Digest</p>
                  <p className="text-sm text-foreground0">Receive a weekly summary of activity</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={profile?.notificationPreferences?.weeklyDigest !== false}
                  className="w-5 h-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent/50"
                />
              </label>

              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="text-foreground">Marketing Emails</p>
                  <p className="text-sm text-foreground0">Product updates and tips</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={profile?.notificationPreferences?.marketingEmails !== false}
                  className="w-5 h-5 rounded border-[var(--card-border)] bg-surface text-accent focus:ring-accent/50"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
