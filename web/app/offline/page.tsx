"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">&#x1F4F6;</div>
        <h1 className="mb-4 text-2xl font-bold text-foreground">You&apos;re Offline</h1>
        <p className="mb-8 text-[var(--text-secondary)]">
          It looks like you&apos;ve lost your internet connection. Some features may not be available
          until you&apos;re back online.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-accent px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
