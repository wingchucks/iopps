"use client";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
  variant?: "default" | "purple";
}

interface AdminFilterButtonsProps {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function AdminFilterButtons({ options, value, onChange }: AdminFilterButtonsProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => {
        const isActive = value === option.value;
        const isPurple = option.variant === "purple";

        const activeClass = isPurple
          ? "bg-purple-500 text-[var(--text-primary)]"
          : "bg-accent text-[var(--text-primary)]";

        const inactiveClass = isPurple
          ? "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-purple-500"
          : "border border-[var(--card-border)] text-[var(--text-secondary)] hover:border-[#14B8A6]";

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive ? activeClass : inactiveClass
            }`}
          >
            {option.label}
            {option.count !== undefined && ` (${option.count})`}
          </button>
        );
      })}
    </div>
  );
}
