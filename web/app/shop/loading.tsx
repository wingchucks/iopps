export default function Loading() {
  return (
    <div className="animate-pulse p-6">
      {/* Hero Skeleton */}
      <div className="rounded-3xl bg-slate-700 h-80 mb-12" />

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-slate-800/50 border border-slate-700 h-80" />
        ))}
      </div>
    </div>
  );
}
