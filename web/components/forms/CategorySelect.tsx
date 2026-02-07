"use client";

import { JOB_CATEGORIES, JobCategory } from "@/lib/types";

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CategorySelect({
  value,
  onChange,
  disabled = false,
  placeholder = "Select a category...",
}: CategorySelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2.5 bg-surface border border-[var(--card-border)] rounded-xl text-foreground focus:outline-none focus:border-[#14B8A6] appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundPosition: "right 0.75rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.5rem 1.5rem",
        paddingRight: "2.5rem",
      }}
    >
      <option value="" className="bg-surface text-[var(--text-muted)]">
        {placeholder}
      </option>
      {JOB_CATEGORIES.map((category) => (
        <option key={category} value={category} className="bg-surface text-foreground">
          {category}
        </option>
      ))}
    </select>
  );
}

// Employment Type Select (bonus component for the job form)
interface EmploymentTypeSelectProps {
  value: string;
  onChange: (type: string) => void;
  disabled?: boolean;
}

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  "Seasonal",
  "Casual",
];

export function EmploymentTypeSelect({
  value,
  onChange,
  disabled = false,
}: EmploymentTypeSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-2.5 bg-surface border border-[var(--card-border)] rounded-xl text-foreground focus:outline-none focus:border-[#14B8A6] appearance-none cursor-pointer"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundPosition: "right 0.75rem center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "1.5rem 1.5rem",
        paddingRight: "2.5rem",
      }}
    >
      <option value="" className="bg-surface text-[var(--text-muted)]">
        Select job type...
      </option>
      {EMPLOYMENT_TYPES.map((type) => (
        <option key={type} value={type} className="bg-surface text-foreground">
          {type}
        </option>
      ))}
    </select>
  );
}

export default CategorySelect;
