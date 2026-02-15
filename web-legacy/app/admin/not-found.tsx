import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/admin" className="text-accent hover:underline">
        Go home
      </Link>
    </div>
  );
}
