"use client";

import Link from "next/link";
import type { UnifiedEducationListing } from "@/lib/types";
import { DiscoveryBadge, FormatBadge } from "@/components/discovery";

interface UnifiedProgramCardProps {
  program: UnifiedEducationListing;
  onProviderClick?: (e: React.MouseEvent, providerId: string) => void;
}

// Category icons for visual distinction
function getCategoryIcon(category?: string): string {
  if (!category) return "📚";
  const lowerCategory = category.toLowerCase();

  if (lowerCategory.includes("business") || lowerCategory.includes("management")) return "💼";
  if (lowerCategory.includes("technology") || lowerCategory.includes("it")) return "💻";
  if (lowerCategory.includes("healthcare") || lowerCategory.includes("health") || lowerCategory.includes("nursing")) return "🏥";
  if (lowerCategory.includes("trades") || lowerCategory.includes("industrial")) return "🔧";
  if (lowerCategory.includes("arts") || lowerCategory.includes("design")) return "🎨";
  if (lowerCategory.includes("science")) return "🔬";
  if (lowerCategory.includes("education") || lowerCategory.includes("teaching")) return "📖";
  if (lowerCategory.includes("law") || lowerCategory.includes("justice")) return "⚖️";
  if (lowerCategory.includes("social") || lowerCategory.includes("community")) return "🤝";
  if (lowerCategory.includes("indigenous")) return "🪶";
  if (lowerCategory.includes("environment") || lowerCategory.includes("natural")) return "🌿";
  if (lowerCategory.includes("engineering")) return "⚙️";
  if (lowerCategory.includes("agriculture")) return "🌾";
  if (lowerCategory.includes("hospitality") || lowerCategory.includes("tourism")) return "🏨";

  return "📚";
}

// Level display labels
const LEVEL_LABELS: Record<string, string> = {
  certificate: "Certificate",
  diploma: "Diploma",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
  microcredential: "Microcredential",
  apprenticeship: "Apprenticeship",
};

export function UnifiedProgramCard({ program, onProviderClick }: UnifiedProgramCardProps) {
  // Determine the correct detail page URL
  const detailUrl =
    program.originalCollection === "education_programs"
      ? `/education/programs/${program.slug || program.originalId}`
      : `/education/training/${program.originalId}`;

  return (
    <Link
      href={detailUrl}
      className="group rounded-2xl border border-[var(--card-border)] bg-surface p-6 transition-all hover:border-[#14B8A6]/50 hover:-translate-y-1"
    >
      {/* Header: Icon + Badges */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 border border-[#14B8A6]/40">
          <span className="text-xl">{getCategoryIcon(program.category)}</span>
        </div>

        <div className="flex flex-col gap-1.5 items-end">
          {/* Source badge */}
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium border ${
              program.source === "school"
                ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                : "bg-amber-500/10 text-amber-300 border-amber-500/30"
            }`}
          >
            {program.source === "school" ? "School" : "Training Provider"}
          </span>

          {/* Level badge (academic only) */}
          {program.level && (
            <span className="rounded-md bg-surface border border-[var(--card-border)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]">
              {LEVEL_LABELS[program.level] || program.level}
            </span>
          )}

          {/* Indigenous-focused badge */}
          {program.indigenousFocused && (
            <DiscoveryBadge variant="indigenous-focused" size="sm" />
          )}

          {/* Featured badge */}
          {program.featured && <DiscoveryBadge variant="featured" size="sm" />}
        </div>
      </div>

      {/* Provider name (clickable if handler provided) */}
      {onProviderClick ? (
        <button
          onClick={(e) => onProviderClick(e, program.providerId)}
          className="text-xs font-semibold text-[#14B8A6] uppercase mb-1 hover:underline text-left"
        >
          {program.providerName}
        </button>
      ) : (
        <p className="text-xs font-semibold text-[#14B8A6] uppercase mb-1">
          {program.providerName}
        </p>
      )}

      {/* Title */}
      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-[#14B8A6] transition-colors line-clamp-2">
        {program.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-2">
        {program.shortDescription || program.description || "Explore this program and its opportunities."}
      </p>

      {/* Skills tags (training programs only) */}
      {program.skills && program.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {program.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded-md bg-slate-700/50 px-2 py-0.5 text-xs text-[var(--text-secondary)]"
            >
              {skill}
            </span>
          ))}
          {program.skills.length > 3 && (
            <span className="text-xs text-foreground0">+{program.skills.length - 3} more</span>
          )}
        </div>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)] mb-4">
        {program.duration && <span>⏱ {program.duration}</span>}
        <FormatBadge format={program.format} size="sm" />
        {program.costDisplay && <span>💰 {program.costDisplay}</span>}
        {program.fundingAvailable && (
          <span className="text-accent">💵 Funding Available</span>
        )}
        {program.certificationOffered && (
          <span>🏅 {program.certificationOffered}</span>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-[var(--card-border)] flex justify-between items-center">
        <span className="text-xs text-foreground0 capitalize">
          {program.category || (program.programType === "academic" ? "Academic Program" : "Training Program")}
        </span>
        <span className="text-sm font-semibold text-[#14B8A6] opacity-0 group-hover:opacity-100 transition-opacity">
          {program.enrollmentType === "external" ? "Learn More →" : "View Program →"}
        </span>
      </div>
    </Link>
  );
}

export default UnifiedProgramCard;
