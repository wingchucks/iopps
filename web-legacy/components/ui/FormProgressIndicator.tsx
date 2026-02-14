"use client";

import { useEffect, useState } from "react";

interface FormSection {
  id: string;
  label: string;
  isComplete: boolean;
}

interface FormProgressIndicatorProps {
  sections: FormSection[];
  currentSection?: string;
  className?: string;
}

/**
 * A progress indicator component for multi-section forms.
 * Shows which sections are complete and highlights the current section.
 */
export function FormProgressIndicator({
  sections,
  currentSection,
  className = "",
}: FormProgressIndicatorProps) {
  const completedCount = sections.filter((s) => s.isComplete).length;
  const progress = Math.round((completedCount / sections.length) * 100);

  return (
    <div className={`rounded-xl border border-[var(--card-border)] bg-surface p-4 ${className}`}>
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-[var(--text-secondary)]">Form Progress</span>
        <span className="text-sm font-semibold text-accent">{progress}%</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Section List */}
      <div className="space-y-2">
        {sections.map((section, index) => {
          const isCurrent = section.id === currentSection;
          return (
            <div
              key={section.id}
              className={`flex items-center gap-3 text-sm ${
                isCurrent ? "text-white" : "text-[var(--text-muted)]"
              }`}
            >
              {/* Status Icon */}
              <div
                className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                  section.isComplete
                    ? "bg-accent/20 text-accent"
                    : isCurrent
                    ? "bg-slate-700 text-white border border-[var(--card-border)]"
                    : "bg-surface text-foreground0"
                }`}
              >
                {section.isComplete ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {/* Section Label */}
              <span className={section.isComplete ? "text-[var(--text-muted)]" : ""}>
                {section.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Hook to track form section visibility using Intersection Observer.
 * Returns the ID of the currently visible section.
 */
export function useFormSectionTracker(sectionIds: string[]): string | undefined {
  const [currentSection, setCurrentSection] = useState<string | undefined>(sectionIds[0]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setCurrentSection(id);
            }
          });
        },
        {
          rootMargin: "-20% 0px -60% 0px",
          threshold: 0,
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [sectionIds]);

  return currentSection;
}
