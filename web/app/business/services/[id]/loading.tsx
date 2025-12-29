export default function ServiceDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Back Link Skeleton */}
      <div className="h-5 w-32 bg-slate-800 rounded mb-6 animate-pulse" />

      {/* Hero Skeleton */}
      <div className="rounded-3xl bg-slate-800/50 h-64 mb-8 animate-pulse" />

      {/* Content Grid */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl bg-slate-800/50 h-48 animate-pulse" />
          <div className="rounded-2xl bg-slate-800/50 h-32 animate-pulse" />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-800/50 h-64 animate-pulse" />
          <div className="rounded-2xl bg-slate-800/50 h-48 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
