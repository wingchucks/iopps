'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { getEmployerProfile } from '@/lib/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { EmployerProfile, OrganizationProfile } from '@/lib/types';
import {
  EyeIcon,
  PencilIcon,
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  EnvelopeIcon,
  PhoneIcon,
  UsersIcon,
  CalendarIcon,
  MapPinIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  ShareIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

type ProfileWithOrgFields = EmployerProfile & Partial<Pick<OrganizationProfile, 'publicationStatus' | 'slug' | 'directoryVisible'>>;

interface ProfileStats {
  activeJobs: number;
  events: number;
  scholarships: number;
}

export default function OrganizationProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileWithOrgFields | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ activeJobs: 0, events: 0, scholarships: 0 });
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'events'>('overview');

  useEffect(() => {
    if (!auth) {
      router.push('/login?redirect=/organization/profile');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login?redirect=/organization/profile');
        return;
      }

      try {
        const employerProfile = await getEmployerProfile(user.uid);
        setProfile(employerProfile as ProfileWithOrgFields | null);

        // Fetch stats if we have a profile
        if (employerProfile && db) {
          const [jobsSnap, eventsSnap, scholarshipsSnap] = await Promise.all([
            getDocs(query(
              collection(db, 'jobPostings'),
              where('employerId', '==', user.uid),
              where('status', '==', 'active')
            )).catch(() => ({ size: 0 })),
            getDocs(query(
              collection(db, 'powwowEvents'),
              where('organizerId', '==', user.uid)
            )).catch(() => ({ size: 0 })),
            getDocs(query(
              collection(db, 'scholarships'),
              where('organizationId', '==', user.uid)
            )).catch(() => ({ size: 0 })),
          ]);
          setStats({
            activeJobs: jobsSnap.size || 0,
            events: eventsSnap.size || 0,
            scholarships: scholarshipsSnap.size || 0,
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    router.push('/organization/onboarding');
    return null;
  }

  const isPublished = profile.publicationStatus === 'PUBLISHED' && profile.slug;
  const publicUrl = profile.slug ? `/organizations/${profile.slug}` : null;
  const memberSince = profile.createdAt 
    ? new Date(profile.createdAt.seconds ? profile.createdAt.seconds * 1000 : profile.createdAt).getFullYear()
    : new Date().getFullYear();

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navy Hero Section */}
      <div className="relative">
        {/* Hero Banner */}
        <div className="h-32 sm:h-40 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.15),transparent_50%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />
          
          {/* Edit Banner Button */}
          <div className="absolute top-4 right-4 flex gap-2">
            {isPublished ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Published
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium rounded-full">
                Draft
              </span>
            )}
          </div>
        </div>

        {/* Profile Info Overlay */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="relative -mt-16 sm:-mt-20 pb-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
              {/* Logo */}
              <div className="relative">
                {profile.logoUrl ? (
                  <Image
                    src={profile.logoUrl}
                    alt={profile.organizationName || 'Organization'}
                    width={120}
                    height={120}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-slate-950 shadow-xl bg-slate-800"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white font-bold text-3xl sm:text-4xl border-4 border-slate-950 shadow-xl">
                    {getInitials(profile.organizationName || 'ORG')}
                  </div>
                )}
                {/* Edit Photo Button */}
                <Link
                  href="/organization/onboarding?section=branding"
                  className="absolute -bottom-2 -right-2 p-2 bg-slate-800 border border-slate-700 rounded-full hover:bg-slate-700 transition-colors"
                  title="Change logo"
                >
                  <PencilIcon className="w-4 h-4 text-slate-300" />
                </Link>
              </div>

              {/* Name & Info */}
              <div className="flex-1 pt-2 sm:pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                      {profile.organizationName || 'Your Organization'}
                      {isPublished && (
                        <CheckBadgeIcon className="w-6 h-6 text-teal-400" title="Verified" />
                      )}
                    </h1>
                    {profile.location && (
                      <p className="text-slate-400 mt-1 flex items-center gap-1.5">
                        <MapPinIcon className="w-4 h-4" />
                        {profile.location}
                      </p>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="hidden sm:flex gap-2">
                    {publicUrl && isPublished && (
                      <Link
                        href={publicUrl}
                        target="_blank"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors"
                      >
                        <EyeIcon className="w-5 h-5" />
                        View Public
                        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                      </Link>
                    )}
                    <Link
                      href="/organization/onboarding"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors"
                    >
                      <PencilIcon className="w-5 h-5" />
                      Edit Profile
                    </Link>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-6 mt-4 text-sm">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{stats.activeJobs}</p>
                    <p className="text-slate-400">Active Jobs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{stats.events}</p>
                    <p className="text-slate-400">Events</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{stats.scholarships}</p>
                    <p className="text-slate-400">Scholarships</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{memberSince}</p>
                    <p className="text-slate-400">Member Since</p>
                  </div>
                </div>

                {/* Mobile Action Buttons */}
                <div className="flex sm:hidden gap-2 mt-4">
                  {publicUrl && isPublished && (
                    <Link
                      href={publicUrl}
                      target="_blank"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors flex-1"
                    >
                      <EyeIcon className="w-5 h-5" />
                      View Public
                    </Link>
                  )}
                  <Link
                    href="/organization/onboarding"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors flex-1"
                  >
                    <PencilIcon className="w-5 h-5" />
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 sticky top-0 bg-slate-950/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BuildingOffice2Icon },
              { id: 'jobs', label: 'Jobs', icon: BriefcaseIcon },
              { id: 'events', label: 'Events', icon: CalendarIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* About Section */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">About</h2>
                  <Link
                    href="/organization/onboarding?section=about"
                    className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </Link>
                </div>
                {profile.description ? (
                  <p className="text-slate-300 whitespace-pre-wrap">{profile.description}</p>
                ) : (
                  <p className="text-slate-500 italic">No description added yet. Add one to help members learn about your organization.</p>
                )}
              </div>

              {/* Story Section */}
              {profile.story && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-white">Our Story</h2>
                    <Link
                      href="/organization/onboarding?section=about"
                      className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </Link>
                  </div>
                  <p className="text-slate-300 whitespace-pre-wrap">{profile.story}</p>
                </div>
              )}

              {/* Not Published Warning */}
              {!isPublished && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
                  <h3 className="text-amber-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="text-xl">⚠️</span>
                    Profile Not Published
                  </h3>
                  <p className="text-slate-300 mb-4">
                    Your profile is not yet visible to the public. Complete all required fields and publish to appear in the organization directory.
                  </p>
                  <Link
                    href="/organization/onboarding"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium rounded-xl transition-colors"
                  >
                    Complete Profile Setup
                  </Link>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Facts */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Facts</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Member Since</dt>
                    <dd className="text-white font-medium">{memberSince}</dd>
                  </div>
                  {profile.foundedYear && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Founded</dt>
                      <dd className="text-white font-medium">{profile.foundedYear}</dd>
                    </div>
                  )}
                  {profile.teamSize && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Team Size</dt>
                      <dd className="text-white font-medium">{profile.teamSize}</dd>
                    </div>
                  )}
                  {profile.industry && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Industry</dt>
                      <dd className="text-white font-medium">{profile.industry}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Contact Info */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Contact Info</h3>
                  <Link
                    href="/organization/onboarding?section=contact"
                    className="text-teal-400 hover:text-teal-300 text-sm flex items-center gap-1"
                  >
                    <PencilIcon className="w-4 h-4" />
                    Edit
                  </Link>
                </div>
                <div className="space-y-3">
                  {profile.contactEmail && (
                    <div className="flex items-center gap-3 text-sm">
                      <EnvelopeIcon className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-300">{profile.contactEmail}</span>
                    </div>
                  )}
                  {profile.contactPhone && (
                    <div className="flex items-center gap-3 text-sm">
                      <PhoneIcon className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-300">{profile.contactPhone}</span>
                    </div>
                  )}
                  {profile.websiteUrl && (
                    <div className="flex items-center gap-3 text-sm">
                      <GlobeAltIcon className="w-5 h-5 text-slate-400" />
                      <a
                        href={profile.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-400 hover:underline truncate"
                      >
                        {profile.websiteUrl.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                  {!profile.contactEmail && !profile.contactPhone && !profile.websiteUrl && (
                    <p className="text-slate-500 text-sm italic">No contact info added yet.</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <Link
                    href="/organization/jobs/new"
                    className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <BriefcaseIcon className="w-5 h-5 text-teal-400" />
                    <span className="text-slate-200">Post a New Job</span>
                  </Link>
                  <Link
                    href="/organization/events/new"
                    className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <CalendarIcon className="w-5 h-5 text-teal-400" />
                    <span className="text-slate-200">Create an Event</span>
                  </Link>
                  <Link
                    href="/organization"
                    className="flex items-center gap-3 p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <BuildingOffice2Icon className="w-5 h-5 text-teal-400" />
                    <span className="text-slate-200">Go to Dashboard</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="text-center py-12">
            <BriefcaseIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {stats.activeJobs > 0 ? `${stats.activeJobs} Active Job${stats.activeJobs === 1 ? '' : 's'}` : 'No Active Jobs'}
            </h3>
            <p className="text-slate-400 mb-6">
              {stats.activeJobs > 0
                ? 'Manage your job postings from the dashboard.'
                : 'Post jobs to attract Indigenous talent to your organization.'}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/organization/jobs/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors"
              >
                Post a Job
              </Link>
              {stats.activeJobs > 0 && (
                <Link
                  href="/organization/jobs"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  Manage Jobs
                </Link>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              {stats.events > 0 ? `${stats.events} Event${stats.events === 1 ? '' : 's'}` : 'No Events Yet'}
            </h3>
            <p className="text-slate-400 mb-6">
              {stats.events > 0
                ? 'Manage your events from the dashboard.'
                : 'Create events to connect with the Indigenous community.'}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/organization/events/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white font-medium rounded-xl transition-colors"
              >
                Create Event
              </Link>
              {stats.events > 0 && (
                <Link
                  href="/organization/events"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  Manage Events
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
