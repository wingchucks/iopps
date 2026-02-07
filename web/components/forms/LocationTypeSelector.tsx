"use client";

import { LocationType } from "@/lib/types";

interface LocationTypeSelectorProps {
  locationType: LocationType;
  locationAddress: string;
  onLocationTypeChange: (type: LocationType) => void;
  onAddressChange: (address: string) => void;
  disabled?: boolean;
}

const LOCATION_TYPES: { value: LocationType; label: string; description: string }[] = [
  { value: "onsite", label: "Onsite", description: "Work from the office" },
  { value: "remote", label: "Remote", description: "Work from anywhere" },
  { value: "hybrid", label: "Hybrid", description: "Mix of remote & onsite" },
];

export function LocationTypeSelector({
  locationType,
  locationAddress,
  onLocationTypeChange,
  onAddressChange,
  disabled = false,
}: LocationTypeSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Location Type Radio Buttons */}
      <div className="flex flex-wrap gap-4">
        {LOCATION_TYPES.map((type) => (
          <label
            key={type.value}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
              locationType === type.value
                ? "border-[#14B8A6] bg-accent/10"
                : "border-[var(--card-border)] bg-surface hover:border-[var(--card-border)]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input
              type="radio"
              name="locationType"
              value={type.value}
              checked={locationType === type.value}
              onChange={(e) => onLocationTypeChange(e.target.value as LocationType)}
              disabled={disabled}
              className="w-4 h-4 border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-background"
            />
            <div>
              <div className="text-sm font-medium text-foreground">{type.label}</div>
              <div className="text-xs text-[var(--text-muted)]">{type.description}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Location Address Input - show for onsite and hybrid */}
      {(locationType === "onsite" || locationType === "hybrid") && (
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-2">
            Office Location
            {locationType === "hybrid" && (
              <span className="text-foreground0 ml-1">(primary office)</span>
            )}
          </label>
          <input
            type="text"
            value={locationAddress}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="e.g., Saskatoon, SK, Canada"
            disabled={disabled}
            className="w-full px-4 py-2.5 bg-surface border border-[var(--card-border)] rounded-xl text-foreground placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
          />
        </div>
      )}

      {/* Remote info message */}
      {locationType === "remote" && (
        <div className="flex items-start gap-2 p-3 bg-surface border border-[var(--card-border)] rounded-xl">
          <svg
            className="w-5 h-5 text-[#14B8A6] mt-0.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-[var(--text-muted)]">
            This position can be performed from anywhere. You can optionally specify a preferred
            region or timezone requirements in the job description.
          </div>
        </div>
      )}
    </div>
  );
}

export default LocationTypeSelector;
