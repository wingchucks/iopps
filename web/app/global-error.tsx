"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted mb-6">
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-accent text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
