"use client";
import { useId } from "react";
import { isValidClosingDate } from "@/lib/job-closing-date";
export default function ClosingDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  const invalid = !isValidClosingDate(value);
  return <div>
    <label htmlFor={id} className="block text-sm font-semibold mb-1.5">Closing date (optional)</label>
    <div className="flex gap-2">
      <input id={id} type="text" autoComplete="off" placeholder="YYYY-MM-DD" maxLength={10} value={value}
        aria-describedby={`${id}-hint`} aria-invalid={invalid} onChange={event => onChange(event.target.value)}
        className="min-w-0 w-full px-4 py-3 rounded-xl border border-border bg-bg text-text" />
      <button type="button" onClick={() => onChange("")} disabled={!value} className="min-h-11 px-3 rounded-xl border border-border disabled:opacity-50">Clear date</button>
    </div>
    <p id={`${id}-hint`} className="text-sm mt-2">Type a date as YYYY-MM-DD, for example 2027-01-31. Leave blank if there is no closing date.</p>
    {invalid && <p role="alert" className="text-sm text-error mt-1">Enter a real calendar date in YYYY-MM-DD format, or clear the date.</p>}
  </div>;
}
