"use client";

import { useState } from "react";
import { ClockIcon, CalendarIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ScheduledPublishInputProps {
  value: string | Date | null | undefined;
  onChange: (date: string | null) => void;
  label?: string;
  helpText?: string;
  disabled?: boolean;
  minDate?: Date;
}

/**
 * A form input for scheduling content publication.
 * Provides a date/time picker with clear option and relative time display.
 */
export function ScheduledPublishInput({
  value,
  onChange,
  label = "Schedule Publication",
  helpText = "Leave empty to publish immediately, or set a future date/time",
  disabled = false,
  minDate,
}: ScheduledPublishInputProps) {
  const [isScheduling, setIsScheduling] = useState(!!value);

  // Format date for datetime-local input
  const formatForInput = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    // Format as YYYY-MM-DDTHH:mm for datetime-local
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Get minimum date for input (default to now)
  const getMinDate = (): string => {
    const d = minDate || new Date();
    return formatForInput(d);
  };

  // Get relative time display
  const getRelativeTime = (date: string | Date | null | undefined): string => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";

    const now = new Date();
    const diff = d.getTime() - now.getTime();

    if (diff < 0) return "In the past";

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `In ${days} day${days > 1 ? "s" : ""}`;
    if (hours > 0) return `In ${hours} hour${hours > 1 ? "s" : ""}`;
    if (minutes > 0) return `In ${minutes} minute${minutes > 1 ? "s" : ""}`;
    return "Shortly";
  };

  const handleToggle = () => {
    if (isScheduling) {
      setIsScheduling(false);
      onChange(null);
    } else {
      setIsScheduling(true);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (newValue) {
      // Convert to ISO string for storage
      onChange(new Date(newValue).toISOString());
    } else {
      onChange(null);
    }
  };

  const handleClear = () => {
    setIsScheduling(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
            isScheduling
              ? "text-blue-400 hover:text-blue-300"
              : "text-slate-400 hover:text-slate-300"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ClockIcon className="h-3.5 w-3.5" />
          {isScheduling ? "Scheduling enabled" : "Schedule for later"}
        </button>
      </div>

      {isScheduling && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <CalendarIcon className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="datetime-local"
              value={formatForInput(value)}
              onChange={handleDateChange}
              min={getMinDate()}
              disabled={disabled}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 pl-10 pr-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className="p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
            title="Clear schedule"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {isScheduling && value && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-blue-400">{getRelativeTime(value)}</span>
          <span className="text-slate-500">
            ({new Date(value as string).toLocaleString()})
          </span>
        </div>
      )}

      {!isScheduling && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}
    </div>
  );
}

export default ScheduledPublishInput;
