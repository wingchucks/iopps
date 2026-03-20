import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--bg)" }}
    >
      <div className="text-center max-w-[440px]">
        <Link href="/" className="inline-flex items-center gap-2 no-underline mb-10">
          <Image src="/logo.png" alt="IOPPS" width={36} height={36} />
          <span className="text-text text-lg font-extrabold tracking-[2px]">IOPPS</span>
        </Link>

        <h1
          className="font-extrabold mb-2"
          style={{ fontSize: 72, color: "var(--navy)", lineHeight: 1 }}
        >
          404
        </h1>
        <h2 className="text-xl font-bold text-text mb-3">Page not found</h2>
        <p className="text-text-sec text-[15px] mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/feed"
            className="inline-block font-bold no-underline transition-all duration-150 hover:opacity-90"
            style={{
              padding: "13px 28px",
              borderRadius: 12,
              background: "var(--teal)",
              color: "#fff",
              fontSize: 15,
            }}
          >
            Go to Feed
          </Link>
          <Link
            href="/"
            className="inline-block font-semibold no-underline transition-all duration-150 hover:opacity-80"
            style={{
              padding: "13px 28px",
              borderRadius: 12,
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--text-sec)",
              fontSize: 15,
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
