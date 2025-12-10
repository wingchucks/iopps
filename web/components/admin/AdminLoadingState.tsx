"use client";

interface AdminLoadingStateProps {
  message?: string;
}

export function AdminLoadingState({ message = "Loading..." }: AdminLoadingStateProps) {
  return (
    <div className="min-h-screen bg-[#020306] px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <p className="text-slate-400">{message}</p>
      </div>
    </div>
  );
}
