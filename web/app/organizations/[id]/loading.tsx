export default function OrganizationDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Link */}
      <div className="h-5 w-40 bg-slate-800 rounded animate-pulse mb-6" />

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 mb-8 animate-pulse">
        {/* Banner */}
        <div className="h-48 sm:h-64" />

        {/* Profile Info */}
        <div className="relative px-6 pb-6 sm:px-8">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {/* Logo */}
            <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl bg-slate-700 -mt-12 sm:-mt-16" />

            {/* Info */}
            <div className="flex-1 pt-2 sm:pt-4">
              <div className="h-8 w-64 bg-slate-700 rounded mb-3" />
              <div className="h-4 w-48 bg-slate-700 rounded mb-4" />
              <div className="flex flex-wrap gap-3">
                <div className="h-6 w-24 bg-slate-700 rounded-full" />
                <div className="h-6 w-32 bg-slate-700 rounded-full" />
                <div className="h-6 w-28 bg-slate-700 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 border-b border-slate-800">
        <div className="flex gap-2 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-slate-800 rounded-t animate-pulse" />
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
            <div className="h-6 w-32 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              <div className="h-4 w-full bg-slate-700 rounded" />
              <div className="h-4 w-full bg-slate-700 rounded" />
              <div className="h-4 w-3/4 bg-slate-700 rounded" />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
            <div className="h-6 w-24 bg-slate-700 rounded mb-4" />
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 w-full bg-slate-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
