'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import { getEmployerProfile } from '@/lib/firestore';
import type { EmployerProfile } from '@/lib/types';
import {
  EyeIcon,
  PencilIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function OrganizationProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<EmployerProfile | null>(null);

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
        setProfile(employerProfile);
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

  // No profile - redirect to onboarding
  if (!profile) {
    router.push('/organization/onboarding');
    return null;
  }

  const isPublished = profile.publicationStatus === 'PUBLISHED' && profile.slug;
  const publicUrl = profile.slug ? `/businesses/${profile.slug}` : null;

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-50 mb-2">Your Public Profile</h1>
          <p className="text-slate-400">
            Manage how your organization appears to the public
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-card border border-card-border rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {profile.logoUrl ? (
              <Image
                src={profile.logoUrl}
                alt={profile.organizationName || 'Organization'}
                width={64}
                height={64}
                className="w-16 h-16 rounded-xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent to-teal-700 flex items-center justify-center text-slate-950 font-bold text-2xl">
                {profile.organizationName?.charAt(0) || 'O'}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-slate-50">
                {profile.organizationName || 'Your Organization'}
              </h2>
              <p className="text-slate-400 text-sm">
                {profile.location || 'Location not set'}
              </p>
            </div>
          </div>

          {/* Publication Status */}
          <div className={`p-4 rounded-xl mb-6 ${
            isPublished
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-amber-500/10 border border-amber-500/20'
          }`}>
            {isPublished ? (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <p className="text-green-400 font-medium">Published</p>
                  <p className="text-slate-400 text-sm">Your profile is live and visible to the public</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
                <div>
                  <p className="text-amber-400 font-medium">Not Published</p>
                  <p className="text-slate-400 text-sm">Complete your profile to make it visible</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {publicUrl && isPublished && (
              <Link
                href={publicUrl}
                target="_blank"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-accent/90 text-slate-950 font-semibold rounded-xl transition-colors flex-1"
              >
                <EyeIcon className="w-5 h-5" />
                View Public Profile
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </Link>
            )}
            <Link
              href="/organization/onboarding"
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold rounded-xl transition-colors flex-1 ${
                isPublished
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  : 'bg-accent hover:bg-accent/90 text-slate-950'
              }`}
            >
              <PencilIcon className="w-5 h-5" />
              {isPublished ? 'Edit Profile' : 'Complete Profile Setup'}
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="text-center">
          <Link
            href="/organization"
            className="text-accent hover:underline text-sm"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
