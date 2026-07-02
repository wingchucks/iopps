import Link from "next/link";

const COPY: Record<string, { title: string; body: string }> = {
  yes: {
    title: "Thank you — your Featured Talent consent was received",
    body: "IOPPS will review your profile details and confirm your planned feature date before your spotlight goes live.",
  },
  no: {
    title: "Thank you for letting us know",
    body: "We will not feature your profile right now. You can still use IOPPS.ca to find jobs, training, scholarships, events, and other opportunities.",
  },
  "already-used": {
    title: "This response link was already used",
    body: "Your Featured Talent response has already been recorded. If you need to change it, please contact IOPPS.",
  },
  expired: {
    title: "This Featured Talent invitation expired",
    body: "This invitation window has passed. You can still update your IOPPS profile or contact IOPPS if you want to be considered later.",
  },
  invalid: {
    title: "This Featured Talent link is not valid",
    body: "The response link could not be verified. Please check the email link or contact IOPPS.",
  },
  "server-error": {
    title: "We could not record your response",
    body: "There was a temporary issue recording your Featured Talent response. Please try again later or contact IOPPS.",
  },
};

export default async function FeaturedTalentConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "invalid";
  const copy = COPY[status] || COPY.invalid;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-16">
      <section className="mx-auto max-w-xl rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center shadow-sm">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          IOPPS Featured Talent
        </p>
        <h1 className="mb-4 text-3xl font-bold text-[var(--text-primary)]">{copy.title}</h1>
        <p className="mb-8 text-[var(--text-secondary)]">{copy.body}</p>
        <Link
          href="/"
          className="inline-flex rounded-lg bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
        >
          Return to IOPPS.ca
        </Link>
      </section>
    </main>
  );
}
