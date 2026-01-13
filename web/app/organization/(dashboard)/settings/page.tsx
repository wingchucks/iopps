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
import type { EmployerProfile, OrganizationModule } from '@/lib/types';
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
} from '@heroicons/react/24/outline';

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
        <h1 className="text-2xl font-bold text-slate-50">Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your organization settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'general'
              ? 'bg-accent/10 text-accent'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <PlusCircleIcon className="w-4 h-4" />
          Modules
          <span className="px-1.5 py-0.5 text-xs rounded bg-slate-800">
            {enabledModules.length}/5
          </span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'notifications'
              ? 'bg-accent/10 text-accent'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Account Settings</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-slate-800">
                <div>
                  <p className="text-slate-200">Organization ID</p>
                  <p className="text-sm text-slate-500">{profile?.id || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-slate-800">
                <div>
                  <p className="text-slate-200">Account Status</p>
                  <p className="text-sm text-slate-500">{profile?.status || 'Pending'}</p>
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
                  <p className="text-slate-200">Member Since</p>
                  <p className="text-sm text-slate-500">
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
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className="bg-card border border-card-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-50 mb-2">Available Modules</h2>
            <p className="text-sm text-slate-400 mb-6">
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
                      isEnabled ? colorClasses[info.color] : 'border-slate-800 bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-xl bg-slate-900/50 ${iconColors[info.color]}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-200">{info.name}</h3>
                          <p className="text-sm text-slate-500 mt-1">{info.description}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleModule(module)}
                        disabled={isToggling}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          isEnabled
                            ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
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
            <h2 className="text-lg font-semibold text-slate-50 mb-4">Notification Preferences</h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between py-3 border-b border-slate-800">
                <div>
                  <p className="text-slate-200">New Applications</p>
                  <p className="text-sm text-slate-500">Get notified when someone applies</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={profile?.notificationPreferences?.newApplications !== false}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-accent focus:ring-accent/50"
                />
              </label>

              <label className="flex items-center justify-between py-3 border-b border-slate-800">
                <div>
                  <p className="text-slate-200">New Messages</p>
                  <p className="text-sm text-slate-500">Get notified for new inbox messages</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-accent focus:ring-accent/50"
                />
              </label>

              <label className="flex items-center justify-between py-3 border-b border-slate-800">
                <div>
                  <p className="text-slate-200">Weekly Digest</p>
                  <p className="text-sm text-slate-500">Receive a weekly summary of activity</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={profile?.notificationPreferences?.weeklyDigest !== false}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-accent focus:ring-accent/50"
                />
              </label>

              <label className="flex items-center justify-between py-3">
                <div>
                  <p className="text-slate-200">Marketing Emails</p>
                  <p className="text-sm text-slate-500">Product updates and tips</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={profile?.notificationPreferences?.marketingEmails !== false}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-accent focus:ring-accent/50"
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
