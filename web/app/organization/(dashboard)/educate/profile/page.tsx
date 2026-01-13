'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getSchoolByEmployerId } from '@/lib/firestore';
import type { School } from '@/lib/types';
import {
  AcademicCapIcon,
  PencilIcon,
  EyeIcon,
  GlobeAltIcon,
  PhotoIcon,
  CheckCircleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

export default function EducateProfilePage() {
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSchool() {
      if (!user) return;

      try {
        const schoolData = await getSchoolByEmployerId(user.uid);
        setSchool(schoolData);
      } catch (error) {
        console.error('Error loading school profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSchool();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">School Profile</h1>
          <p className="text-slate-400 mt-1">
            Set up your educational institution profile
          </p>
        </div>

        <div className="bg-card border border-card-border rounded-2xl p-12 text-center">
          <AcademicCapIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            No school profile yet
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Create your school profile to share educational programs and scholarships with Indigenous students.
          </p>
          <Link
            href="/organization/school/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            Create School Profile
          </Link>
        </div>
      </div>
    );
  }

  const completionItems = [
    { label: 'School name', done: !!school.name },
    { label: 'Logo', done: !!school.logoUrl },
    { label: 'Description', done: !!school.description },
    { label: 'Location', done: !!school.city || !!school.province },
    { label: 'Website', done: !!school.website },
  ];

  const completionScore = Math.round(
    (completionItems.filter(i => i.done).length / completionItems.length) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">School Profile</h1>
          <p className="text-slate-400 mt-1">
            Manage your educational institution presence
          </p>
        </div>
        <div className="flex gap-2">
          {school.slug && (
            <Link
              href={`/schools/${school.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 transition-colors"
            >
              <EyeIcon className="w-4 h-4" />
              View Public Profile
            </Link>
          )}
          <Link
            href="/organization/school/edit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-slate-950 rounded-lg font-medium hover:bg-accent/90 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            Edit Profile
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Preview */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-2xl overflow-hidden">
          {/* Banner */}
          <div className="aspect-[3/1] bg-gradient-to-br from-purple-900/50 to-slate-900 relative">
            {school.bannerUrl ? (
              <img
                src={school.bannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <PhotoIcon className="w-12 h-12 text-slate-700" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start gap-4 -mt-16">
              <div className="w-24 h-24 rounded-xl bg-slate-800 border-4 border-card flex items-center justify-center overflow-hidden">
                {school.logoUrl ? (
                  <img
                    src={school.logoUrl}
                    alt={school.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <AcademicCapIcon className="w-10 h-10 text-slate-600" />
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-50">
                  {school.name}
                </h2>
                {school.verified && (
                  <CheckCircleIcon className="w-5 h-5 text-accent" />
                )}
              </div>

              {school.type && (
                <p className="text-slate-400 mt-1 capitalize">{school.type}</p>
              )}

              {(school.city || school.province) && (
                <p className="text-sm text-slate-500 mt-2 flex items-center gap-1">
                  <MapPinIcon className="w-4 h-4" />
                  {[school.city, school.province].filter(Boolean).join(', ')}
                </p>
              )}

              {school.description && (
                <p className="text-slate-400 mt-4 line-clamp-3">
                  {school.description}
                </p>
              )}

              {school.website && (
                <a
                  href={school.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-accent hover:underline mt-4 text-sm"
                >
                  <GlobeAltIcon className="w-4 h-4" />
                  {school.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Profile Completion */}
        <div className="bg-card border border-card-border rounded-2xl p-6">
          <h3 className="font-semibold text-slate-50 mb-4">Profile Completion</h3>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Progress</span>
              <span className="text-accent font-medium">{completionScore}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${completionScore}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {completionItems.map(item => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-sm"
              >
                {item.done ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-400" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600" />
                )}
                <span className={item.done ? 'text-slate-400' : 'text-slate-500'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {completionScore < 100 && (
            <Link
              href="/organization/school/edit"
              className="block text-center text-sm text-accent hover:underline mt-4"
            >
              Complete your profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
