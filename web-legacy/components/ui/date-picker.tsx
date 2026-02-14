"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  startOfDay,
} from "date-fns";

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date;
  className?: string;
  name?: string;
  error?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  minDate,
  className = "",
  name,
  error = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(
    value ? new Date(value) : new Date()
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse the value to a Date object
  const selectedDate = value ? new Date(value + "T00:00:00") : null;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleDateClick = (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: React.ReactElement[] = [];
    let day = startDate;

    while (day <= endDate) {
      const currentDay = day;
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isCurrentMonth = isSameMonth(day, currentMonth);
      const isTodayDate = isToday(day);
      const isDisabled = minDate
        ? isBefore(day, startOfDay(minDate))
        : false;

      days.push(
        <button
          key={day.toISOString()}
          type="button"
          onClick={() => !isDisabled && handleDateClick(currentDay)}
          disabled={isDisabled}
          className={`
            w-9 h-9 flex items-center justify-center rounded-lg text-sm transition-colors
            ${!isCurrentMonth ? "text-[var(--text-secondary)]" : "text-[var(--text-secondary)]"}
            ${isSelected ? "bg-accent text-[var(--text-primary)] font-semibold" : ""}
            ${!isSelected && isTodayDate ? "border border-[#14B8A6] text-[#14B8A6]" : ""}
            ${!isSelected && !isTodayDate && isCurrentMonth && !isDisabled ? "hover:bg-surface" : ""}
            ${isDisabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
          `}
        >
          {format(day, "d")}
        </button>
      );
      day = addDays(day, 1);
    }

    return days;
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-lg border bg-surface px-4 py-2.5 text-left text-foreground focus:outline-none flex items-center justify-between ${error ? 'border-red-500 focus:border-red-500' : 'border-[var(--card-border)] focus:border-[#14B8A6]'}`}
      >
        <span className={selectedDate ? "text-foreground" : "text-foreground0"}>
          {selectedDate ? format(selectedDate, "MMMM d, yyyy") : placeholder}
        </span>
        <svg
          className="w-5 h-5 text-[var(--text-muted)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Hidden input for form value */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Calendar dropdown */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute left-0 top-full z-50 mt-2 w-[300px] rounded-xl border border-[var(--card-border)] bg-surface p-4 shadow-xl">
            {/* Header with month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-2 rounded-lg hover:bg-surface text-[var(--text-muted)] hover:text-foreground transition-colors"
                aria-label="Previous month"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span className="text-sm font-semibold text-foreground">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-2 rounded-lg hover:bg-surface text-[var(--text-muted)] hover:text-foreground transition-colors"
                aria-label="Next month"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            {/* Week day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="w-9 h-8 flex items-center justify-center text-xs font-medium text-foreground0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">{renderDays()}</div>

            {/* Quick actions */}
            <div className="mt-4 pt-3 border-t border-[var(--card-border)] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="text-xs text-foreground0 hover:text-[var(--text-secondary)] transition-colors"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setCurrentMonth(today);
                  handleDateClick(today);
                }}
                className="text-xs text-[#14B8A6] hover:text-[#16cdb8] transition-colors font-medium"
              >
                Today
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
