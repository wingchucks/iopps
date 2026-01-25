"use client";

import { Globe, Users, Briefcase, Lock, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { FieldVisibility } from "@/lib/firestore/memberSettings";

interface PrivacyIndicatorProps {
  visibility: FieldVisibility;
  onChange?: (visibility: FieldVisibility) => void;
  fieldName: string;
  editable?: boolean;
  size?: "sm" | "md";
}

const VISIBILITY_CONFIG: Record<FieldVisibility, {
  label: string;
  shortLabel: string;
  icon: typeof Globe;
  color: string;
  bgColor: string;
  description: string;
}> = {
  public: {
    label: "Public",
    shortLabel: "Public",
    icon: Globe,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    description: "Visible to all IOPPS members",
  },
  connections: {
    label: "Connections Only",
    shortLabel: "Connections",
    icon: Users,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    description: "Only your connections can see this",
  },
  employers: {
    label: "Employers Only",
    shortLabel: "Employers",
    icon: Briefcase,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    description: "Visible when you apply to jobs",
  },
  private: {
    label: "Private",
    shortLabel: "Private",
    icon: Lock,
    color: "text-slate-400",
    bgColor: "bg-slate-500/10 border-slate-500/20",
    description: "Only you can see this",
  },
};

export function PrivacyIndicator({
  visibility,
  onChange,
  fieldName,
  editable = false,
  size = "sm",
}: PrivacyIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const config = VISIBILITY_CONFIG[visibility];
  const Icon = config.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  if (!editable) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${config.bgColor} ${config.color}`}
        title={`${fieldName}: ${config.description}`}
      >
        <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        <span className={size === "sm" ? "sr-only sm:not-sr-only" : ""}>{config.shortLabel}</span>
      </span>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-colors hover:bg-slate-800 ${config.bgColor} ${config.color}`}
        title={`${fieldName}: ${config.description}. Click to change.`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
        <span className={size === "sm" ? "sr-only sm:not-sr-only" : ""}>{config.shortLabel}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-slate-700 bg-slate-900 p-1 shadow-xl shadow-black/50">
          <div className="px-2 py-1.5 text-xs font-medium text-slate-500 border-b border-slate-800 mb-1">
            Who can see your {fieldName.toLowerCase()}?
          </div>
          {(Object.keys(VISIBILITY_CONFIG) as FieldVisibility[]).map((key) => {
            const option = VISIBILITY_CONFIG[key];
            const OptionIcon = option.icon;
            const isSelected = key === visibility;

            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange?.(key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-3 rounded-lg px-2 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-slate-800"
                    : "hover:bg-slate-800/50"
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <OptionIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${option.color}`} />
                <div>
                  <p className={`text-sm font-medium ${isSelected ? "text-white" : "text-slate-300"}`}>
                    {option.label}
                  </p>
                  <p className="text-xs text-slate-500">{option.description}</p>
                </div>
                {isSelected && (
                  <div className="ml-auto flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Compact badge version for inline use
export function PrivacyBadge({ visibility }: { visibility: FieldVisibility }) {
  const config = VISIBILITY_CONFIG[visibility];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 ${config.color}`}
      title={config.description}
    >
      <Icon className="h-3 w-3" />
    </span>
  );
}

export { VISIBILITY_CONFIG };
