// TODO: Implement styled 404 page with navigation links
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-accent">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">Page Not Found</h2>
      <p className="mt-2 text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-accent px-6 py-3 font-semibold text-white transition hover:bg-accent-hover"
      >
        Go Home
      </Link>
    </div>
  );
}
