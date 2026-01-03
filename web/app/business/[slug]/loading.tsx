export default function Loading() {
  return (
    <div className="animate-pulse p-6">
      <div className="h-6 w-40 bg-slate-700 rounded mb-6" />
      <div className="rounded-3xl bg-slate-800/50 border border-slate-700 overflow-hidden mb-8">
        <div className="h-80 bg-slate-700" />
        <div className="p-6 pt-16">
          <div className="h-8 w-64 bg-slate-700 rounded mb-2" />
          <div className="h-4 w-48 bg-slate-700 rounded" />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <div className="h-6 w-24 bg-slate-700 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-700 rounded w-5/6" />
              <div className="h-4 bg-slate-700 rounded w-4/6" />
            </div>
          </div>
        </div>
        <div>
          <div className="rounded-2xl bg-slate-800/50 border border-slate-700 p-6">
            <div className="h-6 w-24 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-slate-700 rounded w-full" />
              <div className="h-4 bg-slate-700 rounded w-3/4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
