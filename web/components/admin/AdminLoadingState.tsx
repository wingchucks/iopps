"use client";

interface AdminLoadingStateProps {
  message?: string;
}

export function AdminLoadingState({ message = "Loading..." }: AdminLoadingStateProps) {
  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-[var(--text-muted)]">{message}</p>
      </div>
    </div>
  );
}
