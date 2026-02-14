export default function TestimonialSection() {
  return (
    <section className="bg-[var(--card-bg)] py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <svg
          className="mx-auto h-10 w-10 text-accent/30"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
        </svg>
        <blockquote className="mt-6">
          <p className="text-xl font-medium leading-relaxed text-[var(--text-primary)] sm:text-2xl">
            IOPPS has transformed how we connect with Indigenous talent. The
            platform respects our values while delivering real results for our
            hiring needs.
          </p>
        </blockquote>
        <div className="mt-6">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            David Couture
          </p>
          <p className="text-sm text-foreground0">
            Northern Lights Consulting
          </p>
        </div>
      </div>
    </section>
  );
}
