'use client';

import Link from 'next/link';
import type { MemberProfile } from '@/lib/types';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';

interface ProfileCompletenessProps {
  profile: MemberProfile;
  compact?: boolean;
}

interface CheckItem {
  id: string;
  label: string;
  description: string;
  href: string;
  check: (p: MemberProfile) => boolean;
  weight: number;
}

const PROFILE_CHECKS: CheckItem[] = [
  {
    id: 'avatar',
    label: 'Profile Photo',
    description: 'Add a professional photo',
    href: '#header',
    check: (p) => !!(p.avatarUrl || p.photoURL),
    weight: 10,
  },
  {
    id: 'headline',
    label: 'Headline',
    description: 'Tell employers what you do',
    href: '#header',
    check: (p) => !!(p.tagline && p.tagline.length >= 10),
    weight: 10,
  },
  {
    id: 'bio',
    label: 'About / Bio',
    description: 'Write a short introduction',
    href: '#about',
    check: (p) => !!(p.bio && p.bio.length >= 50),
    weight: 15,
  },
  {
    id: 'location',
    label: 'Location',
    description: 'Add your city or region',
    href: '#header',
    check: (p) => !!p.location,
    weight: 5,
  },
  {
    id: 'nation',
    label: 'Nation / Community',
    description: 'Share your Indigenous identity',
    href: '#header',
    check: (p) => !!(p.nation || p.indigenousAffiliation),
    weight: 10,
  },
  {
    id: 'experience',
    label: 'Work Experience',
    description: 'Add at least one position',
    href: '#experience',
    check: (p) => !!(p.experience && p.experience.length > 0),
    weight: 20,
  },
  {
    id: 'education',
    label: 'Education',
    description: 'Add your education history',
    href: '#education',
    check: (p) => !!(p.education && p.education.length > 0),
    weight: 10,
  },
  {
    id: 'skills',
    label: 'Skills',
    description: 'List your key skills',
    href: '#skills',
    check: (p) => !!(p.skills && p.skills.length >= 3),
    weight: 10,
  },
  {
    id: 'resume',
    label: 'Resume',
    description: 'Upload your resume',
    href: '#resume',
    check: (p) => !!(p.resumeUrl),
    weight: 10,
  },
];

export default function ProfileCompleteness({ profile, compact = false }: ProfileCompletenessProps) {
  const results = PROFILE_CHECKS.map(check => ({
    ...check,
    completed: check.check(profile),
  }));

  const completedWeight = results
    .filter(r => r.completed)
    .reduce((sum, r) => sum + r.weight, 0);
  
  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  const percentage = Math.round((completedWeight / totalWeight) * 100);
  
  const incomplete = results.filter(r => !r.completed);
  const nextStep = incomplete[0];

  if (compact) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">Profile Strength</span>
          <span className={`text-sm font-bold ${
            percentage >= 80 ? 'text-green-400' : 
            percentage >= 50 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {percentage}%
          </span>
        </div>
        <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              percentage >= 80 ? 'bg-green-500' : 
              percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {nextStep && percentage < 100 && (
          <Link
            href={nextStep.href}
            className="flex items-center justify-between mt-3 p-2 bg-[var(--background)] rounded-lg hover:bg-accent/10 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Circle className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-sm text-[var(--text-primary)]">{nextStep.label}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-accent" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Profile Completeness</h3>
        <div className={`text-2xl font-bold ${
          percentage >= 80 ? 'text-green-400' : 
          percentage >= 50 ? 'text-amber-400' : 'text-red-400'
        }`}>
          {percentage}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-[var(--background)] rounded-full overflow-hidden mb-4">
        <div
          className={`h-full transition-all duration-500 ${
            percentage >= 80 ? 'bg-green-500' : 
            percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Status message */}
      <p className="text-sm text-[var(--text-muted)] mb-4">
        {percentage >= 100 ? (
          '🎉 Your profile is complete! Employers can now find you easily.'
        ) : percentage >= 80 ? (
          'Almost there! Complete a few more items for maximum visibility.'
        ) : percentage >= 50 ? (
          'Good progress! Keep going to stand out to employers.'
        ) : (
          'Complete your profile to get discovered by employers.'
        )}
      </p>

      {/* Checklist */}
      <div className="space-y-2">
        {results.map(item => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              item.completed 
                ? 'bg-green-500/5 cursor-default' 
                : 'hover:bg-[var(--background)]'
            }`}
          >
            {item.completed ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                item.completed ? 'text-green-400' : 'text-[var(--text-primary)]'
              }`}>
                {item.label}
              </p>
              {!item.completed && (
                <p className="text-xs text-[var(--text-muted)]">{item.description}</p>
              )}
            </div>
            {!item.completed && (
              <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
