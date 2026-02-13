'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getMemberProfile, listJobPostings, checkExistingApplication, listSavedJobs } from '@/lib/firestore';
import type { MemberProfile, JobPosting, SavedJob } from '@/lib/types';
import {
  Sparkles,
  MapPin,
  Briefcase,
  Clock,
  Bookmark,
  BookmarkCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface JobWithScore extends JobPosting {
  matchScore: number;
  matchReasons: string[];
}

export default function JobRecommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    loadRecommendations();
  }, [user]);

  const loadRecommendations = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Load profile and jobs in parallel
      const [profile, jobs, saved] = await Promise.all([
        getMemberProfile(user.uid),
        listJobPostings({ activeOnly: true, pageSize: 50 }),
        listSavedJobs(user.uid),
      ]);

      setSavedJobIds(new Set(saved.map((s: SavedJob) => s.jobId)));

      if (!profile) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      // Check which jobs user already applied to
      const appliedChecks = await Promise.all(
        jobs.slice(0, 20).map((job: JobPosting) => 
          checkExistingApplication(user.uid, job.id).then(applied => ({ jobId: job.id, applied }))
        )
      );
      setAppliedJobIds(new Set(appliedChecks.filter((c: { jobId: string; applied: boolean }) => c.applied).map((c: { jobId: string; applied: boolean }) => c.jobId)));

      // Score jobs based on profile match
      const scored = jobs
        .filter((job: JobPosting) => job.active)
        .map((job: JobPosting) => scoreJob(job, profile))
        .filter((job: JobWithScore) => job.matchScore > 0 && !appliedChecks.find((c: { jobId: string; applied: boolean }) => c.jobId === job.id && c.applied))
        .sort((a: JobWithScore, b: JobWithScore) => b.matchScore - a.matchScore)
        .slice(0, 6);

      setRecommendations(scored);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-[var(--text-primary)]">Recommended Jobs</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-[var(--background)] rounded w-3/4 mb-2" />
              <div className="h-3 bg-[var(--background)] rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-[var(--text-primary)]">Recommended For You</h3>
        </div>
        <button
          onClick={loadRecommendations}
          className="p-1.5 text-[var(--text-muted)] hover:text-accent rounded-lg hover:bg-[var(--background)] transition-colors"
          title="Refresh recommendations"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {recommendations.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Complete your profile to get personalized job recommendations
          </p>
          <Link
            href="/member/profile"
            className="text-sm text-accent hover:underline"
          >
            Update Profile →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map(job => (
            <JobRecommendationCard
              key={job.id}
              job={job}
              isSaved={savedJobIds.has(job.id)}
            />
          ))}
          <Link
            href="/jobs"
            className="flex items-center justify-center gap-2 p-3 text-sm text-accent hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            View All Jobs
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function JobRecommendationCard({ job, isSaved }: { job: JobWithScore; isSaved: boolean }) {
  const postedDate = job.createdAt instanceof Date 
    ? job.createdAt 
    : job.createdAt?.toDate?.();

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block p-3 bg-[var(--background)] rounded-lg hover:bg-accent/5 transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-accent truncate">
            {job.title}
          </h4>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {job.employerName || job.companyName || 'Company'}
          </p>
        </div>
        {isSaved ? (
          <BookmarkCheck className="w-4 h-4 text-accent flex-shrink-0" />
        ) : (
          <Bookmark className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 opacity-0 group-hover:opacity-100" />
        )}
      </div>
      
      <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-muted)]">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {job.location}
          </span>
        )}
        {job.employmentType && (
          <span className="flex items-center gap-1">
            <Briefcase className="w-3 h-3" />
            {job.employmentType}
          </span>
        )}
      </div>

      {/* Match reasons */}
      {job.matchReasons.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {job.matchReasons.slice(0, 2).map((reason, i) => (
            <span
              key={i}
              className="px-1.5 py-0.5 text-[10px] rounded bg-accent/10 text-accent"
            >
              {reason}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

// Simple scoring algorithm
function scoreJob(job: JobPosting, profile: MemberProfile): JobWithScore {
  let score = 0;
  const reasons: string[] = [];

  // Location match
  const profileLocation = (profile.location || '').toLowerCase();
  const jobLocation = (job.location || '').toLowerCase();
  
  if (profileLocation && jobLocation) {
    if (jobLocation.includes(profileLocation) || profileLocation.includes(jobLocation)) {
      score += 30;
      reasons.push('📍 Near you');
    }
  }

  // Remote preference
  if (job.remoteFlag || job.locationType === 'remote') {
    score += 10;
    reasons.push('🏠 Remote');
  }

  // Indigenous preference bonus
  if (job.indigenousPreference) {
    score += 20;
    reasons.push('🪶 Indigenous Preference');
  }

  // Skill match
  const profileSkills = (profile.skills || []).map(s => s.toLowerCase());
  const jobText = `${job.title} ${job.description || ''} ${(job.qualifications || []).join(' ')}`.toLowerCase();
  
  const matchedSkills = profileSkills.filter(skill => jobText.includes(skill));
  if (matchedSkills.length > 0) {
    score += matchedSkills.length * 15;
    reasons.push(`✓ ${matchedSkills.length} skill${matchedSkills.length > 1 ? 's' : ''} match`);
  }

  // Experience level match (basic heuristic)
  const experienceYears = profile.experience?.length || 0;
  if (job.title.toLowerCase().includes('senior') && experienceYears >= 3) {
    score += 10;
  } else if (job.title.toLowerCase().includes('junior') && experienceYears < 3) {
    score += 10;
  } else if (!job.title.toLowerCase().includes('senior') && !job.title.toLowerCase().includes('junior')) {
    score += 5; // Neutral match
  }

  // Will train bonus for less experienced
  if (job.willTrain && experienceYears < 2) {
    score += 15;
    reasons.push('📚 Training provided');
  }

  // Quick Apply bonus
  if (job.quickApplyEnabled) {
    score += 5;
    reasons.push('⚡ Quick Apply');
  }

  // Freshness bonus (prefer newer jobs)
  const postedDate = job.createdAt instanceof Date ? job.createdAt : job.createdAt?.toDate?.();
  if (postedDate) {
    const daysOld = (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 7) {
      score += 10;
      reasons.push('🆕 New');
    } else if (daysOld < 14) {
      score += 5;
    }
  }

  return {
    ...job,
    matchScore: score,
    matchReasons: reasons,
  };
}
