/**
 * IOPPS Social Opportunity Graph — Filter Components
 *
 * Light-theme styled filter controls for section pages.
 */

"use client";

import { colors } from "./tokens";
import { Icon } from "./Icon";

/* ------------------------------------------------------------------ */
/*  FilterBar — Container for filter controls                          */
/* ------------------------------------------------------------------ */

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className = "" }: FilterBarProps) {
  return (
    <div
      className={className}
      style={{
        background: colors.surface,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        padding: "12px 16px",
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SearchInput — Styled search field                                  */
/* ------------------------------------------------------------------ */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: SearchInputProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderRadius: 8,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        flex: "1 1 200px",
        minWidth: 0,
      }}
    >
      <Icon name="search" size={16} color={colors.textMuted} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          border: "none",
          background: "none",
          fontSize: 14,
          color: colors.text,
          outline: "none",
          minWidth: 0,
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 2,
            display: "flex",
          }}
        >
          <Icon name="x" size={14} color={colors.textMuted} />
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterSelect — Dropdown filter                                     */
/* ------------------------------------------------------------------ */

interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
  label?: string;
}

export function FilterSelect({ value, onChange, options, label }: FilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      style={{
        padding: "8px 12px",
        borderRadius: 8,
        border: `1px solid ${colors.border}`,
        background: colors.bg,
        fontSize: 13,
        color: value ? colors.text : colors.textSoft,
        cursor: "pointer",
        outline: "none",
        appearance: "auto",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterChips — Horizontal scrollable pill filters                   */
/* ------------------------------------------------------------------ */

interface FilterChipsProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string; icon?: string }[];
}

export function FilterChips({ value, onChange, options }: FilterChipsProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingBottom: 2,
        flex: "1 1 auto",
      }}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              border: `1px solid ${isActive ? colors.accent : colors.border}`,
              background: isActive ? colors.accentBg : colors.surface,
              color: isActive ? colors.accent : colors.textSoft,
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "all 0.15s",
            }}
          >
            {opt.icon && <span>{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SectionHeader — Page title inside the feed layout                  */
/* ------------------------------------------------------------------ */

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  count?: number;
}

export function SectionHeader({ title, subtitle, icon, count }: SectionHeaderProps) {
  return (
    <div
      style={{
        background: colors.surface,
        borderRadius: 12,
        border: `1px solid ${colors.border}`,
        padding: "20px 24px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {icon && <span style={{ fontSize: 24 }}>{icon}</span>}
        <div style={{ flex: 1 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 700,
              color: colors.text,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {title}
            {count !== undefined && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: colors.textMuted,
                  background: colors.bg,
                  padding: "2px 10px",
                  borderRadius: 12,
                }}
              >
                {count}
              </span>
            )}
          </h1>
          {subtitle && (
            <p style={{ margin: "4px 0 0", fontSize: 14, color: colors.textSoft }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
