"use client";

import type { FormEvent } from "react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onSubmit?: (value: string) => void;
  onClear?: () => void;
  className?: string;
  autoFocus?: boolean;
  name?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function SearchBar({
  value,
  onChange,
  placeholder,
  onSubmit,
  onClear,
  className,
  autoFocus = false,
  name = "q",
  inputRef,
}: SearchBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "flex min-h-12 items-center gap-3 rounded-[20px] border px-4 shadow-sm",
        className,
      )}
      style={{
        background: "var(--card)",
        borderColor: "color-mix(in srgb, var(--teal) 14%, var(--border))",
      }}
    >
      <span className="text-lg" style={{ color: "var(--teal)" }} aria-hidden="true">
        &#128269;
      </span>
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        type="text"
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-full flex-1 border-none bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
      />
      {value ? (
        <button
          type="button"
          onClick={() => (onClear ? onClear() : onChange(""))}
          className="rounded-full border-none bg-transparent p-1 text-base text-text-muted"
          aria-label="Clear search"
        >
          &#10005;
        </button>
      ) : null}
    </form>
  );
}
