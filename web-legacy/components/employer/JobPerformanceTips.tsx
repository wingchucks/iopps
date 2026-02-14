'use client';

import { useMemo } from 'react';
import type { JobPosting } from '@/lib/types';
import {
  LightBulbIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface JobPerformanceTipsProps {
  job: JobPosting;
  viewsCount?: number;
  applicationsCount?: number;
}

interface Tip {
  id: string;
  type: 'success' | 'warning' | 'suggestion';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export function JobPerformanceTips({ job, viewsCount = 0, applicationsCount = 0 }: JobPerformanceTipsProps) {
  const tips = useMemo(() => {
    const allTips: Tip[] = [];

    // Check salary disclosure
    const hasSalary = job.salaryRange && 
      (typeof job.salaryRange === 'string' 
        ? job.salaryRange.length > 0 
        : (job.salaryRange.min || job.salaryRange.max));
    
    if (!hasSalary) {
      allTips.push({
        id: 'salary',
        type: 'warning',
        title: 'Add salary information',
        description: 'Jobs with salary info get 30% more applications. Consider adding a salary range.',
        impact: 'high',
      });
    } else {
      allTips.push({
        id: 'salary-good',
        type: 'success',
        title: 'Salary disclosed',
        description: 'Great! Transparent compensation attracts more qualified candidates.',
        impact: 'high',
      });
    }

    // Check description length
    const descLength = (job.description || '').replace(/<[^>]*>/g, '').length;
    if (descLength < 200) {
      allTips.push({
        id: 'description',
        type: 'warning',
        title: 'Expand your job description',
        description: 'Detailed descriptions (300+ words) help candidates understand the role better.',
        impact: 'high',
      });
    } else if (descLength >= 500) {
      allTips.push({
        id: 'description-good',
        type: 'success',
        title: 'Detailed description',
        description: 'Your comprehensive description helps set clear expectations.',
        impact: 'medium',
      });
    }

    // Check Indigenous preference
    if (job.indigenousPreference) {
      allTips.push({
        id: 'indigenous',
        type: 'success',
        title: 'Indigenous Preference enabled',
        description: 'This flag helps Indigenous job seekers find your posting.',
        impact: 'medium',
      });
    } else {
      allTips.push({
        id: 'indigenous',
        type: 'suggestion',
        title: 'Consider Indigenous Preference',
        description: 'Enable this to signal commitment to Indigenous hiring (TRC #92).',
        impact: 'medium',
      });
    }

    // Check qualifications/responsibilities
    const hasQualifications = job.qualifications && job.qualifications.length > 0;
    const hasResponsibilities = job.responsibilities && job.responsibilities.length > 0;
    
    if (!hasQualifications && !hasResponsibilities) {
      allTips.push({
        id: 'details',
        type: 'warning',
        title: 'Add qualifications & responsibilities',
        description: 'Bullet points make it easy for candidates to assess fit.',
        impact: 'medium',
      });
    }

    // Check application method
    if (!job.applicationLink && !job.applicationEmail && !job.quickApplyEnabled) {
      allTips.push({
        id: 'apply',
        type: 'warning',
        title: 'Add application method',
        description: 'Make sure candidates know how to apply (link, email, or Quick Apply).',
        impact: 'high',
      });
    }

    // Check closing date
    if (!job.closingDate) {
      allTips.push({
        id: 'deadline',
        type: 'suggestion',
        title: 'Add a closing date',
        description: 'Deadlines create urgency and can increase application rates.',
        impact: 'low',
      });
    }

    // Performance-based tips
    if (viewsCount > 0 && applicationsCount === 0) {
      allTips.push({
        id: 'conversion',
        type: 'warning',
        title: 'Views but no applications',
        description: 'People are viewing but not applying. Review your requirements - they might be too strict.',
        impact: 'high',
      });
    }

    if (viewsCount > 50 && applicationsCount > 0) {
      const conversionRate = (applicationsCount / viewsCount) * 100;
      if (conversionRate > 5) {
        allTips.push({
          id: 'performance',
          type: 'success',
          title: 'Strong performance',
          description: `${conversionRate.toFixed(1)}% conversion rate is above average!`,
          impact: 'low',
        });
      }
    }

    // Check for training offered
    if (job.willTrain) {
      allTips.push({
        id: 'training',
        type: 'success',
        title: 'Training offered',
        description: 'Offering training opens the door to more candidates.',
        impact: 'medium',
      });
    }

    return allTips;
  }, [job, viewsCount, applicationsCount]);

  const warnings = tips.filter(t => t.type === 'warning');
  const suggestions = tips.filter(t => t.type === 'suggestion');
  const successes = tips.filter(t => t.type === 'success');

  if (tips.length === 0) return null;

  const score = Math.round(
    (successes.length / tips.length) * 100
  );

  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-foreground">Performance Tips</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-[var(--text-muted)]">Score:</div>
          <div className={`text-lg font-bold ${
            score >= 70 ? 'text-green-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {score}%
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Warnings first */}
        {warnings.map(tip => (
          <TipCard key={tip.id} tip={tip} />
        ))}
        
        {/* Then suggestions */}
        {suggestions.map(tip => (
          <TipCard key={tip.id} tip={tip} />
        ))}
        
        {/* Successes last (collapsed by default if many) */}
        {successes.length > 0 && (
          <div className="pt-2 border-t border-[var(--card-border)]">
            <p className="text-xs text-green-400 mb-2">
              ✓ {successes.length} things you&apos;re doing well
            </p>
            <div className="space-y-2">
              {successes.slice(0, 3).map(tip => (
                <TipCard key={tip.id} tip={tip} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TipCard({ tip, compact = false }: { tip: Tip; compact?: boolean }) {
  const Icon = tip.type === 'success' ? CheckCircleIcon : ExclamationTriangleIcon;
  const colors = {
    success: 'text-green-400 bg-green-900/10',
    warning: 'text-amber-400 bg-amber-900/10',
    suggestion: 'text-blue-400 bg-blue-900/10',
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <CheckCircleIcon className="w-3.5 h-3.5 text-green-400" />
        <span className="text-[var(--text-secondary)]">{tip.title}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${colors[tip.type]}`}>
      <Icon className={`w-5 h-5 mt-0.5 ${colors[tip.type].split(' ')[0]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{tip.title}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{tip.description}</p>
        {tip.impact === 'high' && (
          <span className="inline-block mt-1 px-1.5 py-0.5 text-[10px] font-medium rounded bg-surface text-[var(--text-muted)]">
            High impact
          </span>
        )}
      </div>
    </div>
  );
}
