"use client";

import { SalaryPeriod } from "@/lib/types";

interface SalaryRangeValue {
  min?: number;
  max?: number;
  currency?: string;
  period?: SalaryPeriod;
  disclosed?: boolean;
}

interface SalaryRangeInputProps {
  value: SalaryRangeValue;
  onChange: (value: SalaryRangeValue) => void;
  disabled?: boolean;
}

const SALARY_PERIODS: { value: SalaryPeriod; label: string }[] = [
  { value: "hourly", label: "per hour" },
  { value: "daily", label: "per day" },
  { value: "weekly", label: "per week" },
  { value: "monthly", label: "per month" },
  { value: "yearly", label: "per year" },
];

const CURRENCIES = [
  { value: "CAD", label: "CAD ($)", symbol: "$" },
  { value: "USD", label: "USD ($)", symbol: "$" },
];

export function SalaryRangeInput({
  value,
  onChange,
  disabled = false,
}: SalaryRangeInputProps) {
  const currency = value.currency || "CAD";
  const currencySymbol = CURRENCIES.find((c) => c.value === currency)?.symbol || "$";

  const handleChange = (field: keyof SalaryRangeValue, val: string | number | boolean) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  const handleDisclosedToggle = () => {
    onChange({
      ...value,
      disclosed: !value.disclosed,
      // Clear values if not disclosing
      ...(value.disclosed ? {} : { min: undefined, max: undefined }),
    });
  };

  return (
    <div className="space-y-3">
      {/* Don't Disclose Toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value.disclosed === false}
          onChange={handleDisclosedToggle}
          disabled={disabled}
          className="w-4 h-4 rounded border-[var(--card-border)] bg-surface text-[#14B8A6] focus:ring-[#14B8A6] focus:ring-offset-background"
        />
        <span className="text-sm text-[var(--text-secondary)]">Don&apos;t disclose salary</span>
      </label>

      {value.disclosed !== false && (
        <>
          {/* Currency and Period Selection */}
          <div className="flex gap-3">
            <div className="w-32">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-foreground text-sm focus:outline-none focus:border-[#14B8A6]"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Period</label>
              <select
                value={value.period || "yearly"}
                onChange={(e) => handleChange("period", e.target.value as SalaryPeriod)}
                disabled={disabled}
                className="w-full px-3 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-foreground text-sm focus:outline-none focus:border-[#14B8A6]"
              >
                {SALARY_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Min/Max Inputs */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Minimum</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={value.min || ""}
                  onChange={(e) =>
                    handleChange("min", e.target.value ? Number(e.target.value) : undefined as unknown as number)
                  }
                  placeholder="0"
                  disabled={disabled}
                  className="w-full pl-7 pr-3 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-foreground text-sm placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
                />
              </div>
            </div>
            <span className="text-foreground0 mt-5">—</span>
            <div className="flex-1">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Maximum</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={value.max || ""}
                  onChange={(e) =>
                    handleChange("max", e.target.value ? Number(e.target.value) : undefined as unknown as number)
                  }
                  placeholder="0"
                  disabled={disabled}
                  className="w-full pl-7 pr-3 py-2 bg-surface border border-[var(--card-border)] rounded-lg text-foreground text-sm placeholder-slate-500 focus:outline-none focus:border-[#14B8A6]"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          {(value.min || value.max) && (
            <div className="text-sm text-[var(--text-muted)]">
              Preview:{" "}
              <span className="text-foreground">
                {formatSalaryDisplay(value, currencySymbol)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function formatSalaryDisplay(value: SalaryRangeValue, symbol: string): string {
  const period = value.period || "yearly";
  const periodLabel = SALARY_PERIODS.find((p) => p.value === period)?.label || "per year";

  if (value.min && value.max) {
    return `${symbol}${value.min.toLocaleString()} - ${symbol}${value.max.toLocaleString()} ${periodLabel}`;
  } else if (value.min) {
    return `From ${symbol}${value.min.toLocaleString()} ${periodLabel}`;
  } else if (value.max) {
    return `Up to ${symbol}${value.max.toLocaleString()} ${periodLabel}`;
  }
  return "";
}

export default SalaryRangeInput;
