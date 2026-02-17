import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div
          className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl"
          style={{ background: "rgba(13,148,136,.08)" }}
        >
          &#128270;
        </div>
        <h1 className="text-6xl font-black text-navy tracking-[3px] mb-2">404</h1>
        <h2 className="text-xl font-bold text-text mb-3">Page Not Found</h2>
        <p className="text-sm text-text-sec mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl text-sm font-bold text-white no-underline text-center"
            style={{ background: "var(--teal)" }}
          >
            Go Home
          </Link>
          <Link
            href="/feed"
            className="px-6 py-3 rounded-xl text-sm font-bold text-teal no-underline text-center"
            style={{ border: "2px solid var(--teal)" }}
          >
            Browse Feed
          </Link>
        </div>
        <p
          className="mt-12 tracking-[3px]"
          style={{ fontSize: 9, fontWeight: 800, color: "var(--text-muted)" }}
        >
          EMPOWERING INDIGENOUS SUCCESS
        </p>
      </div>
    </div>
  );
}
