'use client';

import { useMemo } from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';
import type { JobPosting, MemberProfile } from '@/lib/types';

interface JobMatchBadgeProps {
  job: JobPosting;
  profile: MemberProfile | null;
  showDetails?: boolean;
}

interface MatchResult {
  score: number;
  reasons: string[];
}

/**
 * Calculate match score between a job and user profile
 */
function calculateJobMatch(job: JobPosting, profile: MemberProfile): MatchResult {
  const reasons: string[] = [];
  let score = 0;
  const maxScore = 100;

  // Skills match (up to 35 points)
  const jobSkills = [
    ...(job.qualifications || []),
    ...(job.requirements?.split(',').map((s) => s.trim().toLowerCase()) || []),
  ].filter(Boolean);

  const userSkills = (profile.skills || []).map((s) => s.toLowerCase());

  if (jobSkills.length > 0 && userSkills.length > 0) {
    const matchingSkills = userSkills.filter((skill) =>
      jobSkills.some((jSkill) => jSkill.includes(skill) || skill.includes(jSkill))
    );
    const skillMatchPercent = matchingSkills.length / Math.max(jobSkills.length, 1);
    const skillScore = Math.min(skillMatchPercent * 35, 35);
    score += skillScore;
    if (matchingSkills.length > 0) {
      reasons.push(`${matchingSkills.length} skill${matchingSkills.length > 1 ? 's' : ''} match`);
    }
  }

  // Location match (up to 25 points)
  if (job.remoteFlag) {
    score += 25;
    reasons.push('Remote available');
  } else if (profile.location && job.location) {
    const userLoc = profile.location.toLowerCase();
    const jobLoc = job.location.toLowerCase();

    if (userLoc === jobLoc || userLoc.includes(jobLoc) || jobLoc.includes(userLoc)) {
      score += 25;
      reasons.push('Your area');
    } else {
      // Check province match
      const provinces = ['ontario', 'alberta', 'bc', 'british columbia', 'quebec', 'manitoba', 'saskatchewan'];
      const matchedProvince = provinces.find((p) => userLoc.includes(p) && jobLoc.includes(p));
      if (matchedProvince) {
        score += 15;
        reasons.push('Same province');
      }
    }
  }

  // Experience relevance (up to 20 points)
  if (profile.experience?.length && job.description) {
    const expText = profile.experience.map((e) => `${e.position} ${e.company} ${e.description || ''}`).join(' ').toLowerCase();
    const descWords = job.description.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
    const matchingWords = descWords.filter((w) => expText.includes(w));
    if (matchingWords.length > 3) {
      score += 20;
      reasons.push('Relevant experience');
    } else if (matchingWords.length > 1) {
      score += 10;
    }
  }

  // Indigenous preference bonus (up to 10 points)
  if (job.indigenousPreference && profile.indigenousAffiliation) {
    score += 10;
    reasons.push('Indigenous preferred');
  }

  // Recently posted bonus (up to 10 points)
  if (job.createdAt) {
    const created = job.createdAt.toDate ? job.createdAt.toDate() : new Date(job.createdAt as unknown as string);
    const daysSincePosted = (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePosted <= 7) {
      score += 10;
      reasons.push('New posting');
    } else if (daysSincePosted <= 14) {
      score += 5;
    }
  }

  return {
    score: Math.min(Math.round(score), maxScore),
    reasons: reasons.slice(0, 3), // Show top 3 reasons
  };
}

export default function JobMatchBadge({ job, profile, showDetails = false }: JobMatchBadgeProps) {
  const match = useMemo(() => {
    if (!profile) return null;
    return calculateJobMatch(job, profile);
  }, [job, profile]);

  if (!match || match.score < 20) return null;

  // Determine badge color based on score
  const getBadgeStyle = (score: number) => {
    if (score >= 70) {
      return {
        bg: 'bg-accent/20',
        border: 'border-accent/40',
        text: 'text-accent',
        icon: 'text-accent',
      };
    }
    if (score >= 50) {
      return {
        bg: 'bg-accent/20',
        border: 'border-accent/40',
        text: 'text-accent',
        icon: 'text-accent',
      };
    }
    return {
      bg: 'bg-slate-700/50',
      border: 'border-[var(--card-border)]',
      text: 'text-[var(--text-secondary)]',
      icon: 'text-[var(--text-muted)]',
    };
  };

  const style = getBadgeStyle(match.score);

  return (
    <div className="relative group" tabIndex={0} role="button" aria-label={`${match.score}% match`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} border ${style.border} px-2.5 py-1 text-xs font-semibold ${style.text}`}
      >
        <SparklesIcon className={`w-3.5 h-3.5 ${style.icon}`} />
        {match.score}% Match
      </span>

      {/* Tooltip with reasons */}
      {(showDetails || match.reasons.length > 0) && (
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block group-focus-within:block z-50">
          <div className="bg-surface border border-[var(--card-border)] rounded-lg p-3 shadow-xl min-w-[180px]">
            <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">Why this matches:</p>
            <ul className="space-y-1">
              {match.reasons.map((reason, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  {reason}
                </li>
              ))}
            </ul>
            {match.score >= 70 && (
              <p className="mt-2 pt-2 border-t border-[var(--card-border)] text-xs text-accent font-medium">
                Great match for you!
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export the calculation function for reuse
export { calculateJobMatch };
export type { MatchResult };
