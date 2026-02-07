import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
            <div className="text-center">
                <div className="inline-flex items-center justify-center rounded-full bg-accent/10 p-6">
                    <svg
                        className="h-16 w-16 text-[#14B8A6]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>

                <h1 className="mt-6 text-6xl font-bold text-foreground">404</h1>
                <h2 className="mt-4 text-2xl font-semibold text-foreground">
                    Page Not Found
                </h2>
                <p className="mt-4 max-w-md text-[var(--text-muted)]">
                    Sorry, we couldn't find the page you're looking for. The opportunity
                    you're seeking might have moved or no longer exists.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/"
                        className="rounded-full bg-accent px-6 py-3 font-semibold text-slate-900 transition hover:bg-[#0F9488]"
                    >
                        Go Home
                    </Link>
                    <Link
                        href="/careers"
                        className="rounded-full border border-[var(--card-border)] px-6 py-3 font-semibold text-foreground transition hover:border-[#14B8A6] hover:text-[#14B8A6]"
                    >
                        Browse Jobs
                    </Link>
                </div>

                <div className="mt-8">
                    <p className="text-sm text-foreground0">
                        Need help? <Link href="/contact" className="text-[#14B8A6] hover:underline">Contact us</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
