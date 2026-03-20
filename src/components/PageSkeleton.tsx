interface PageSkeletonProps {
  variant?: "list" | "detail" | "grid";
}

export default function PageSkeleton({ variant = "list" }: PageSkeletonProps) {
  if (variant === "detail") {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-10 w-40 rounded mb-4" />
        <div className="skeleton h-[180px] rounded-2xl mb-6" />
        <div className="flex flex-col gap-3">
          <div className="skeleton h-5 w-full rounded" />
          <div className="skeleton h-5 w-3/4 rounded" />
          <div className="skeleton h-5 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="max-w-[1100px] mx-auto px-4 py-6 md:px-10 md:py-8">
        <div className="skeleton h-10 w-48 rounded mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-[200px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Default: list
  return (
    <div className="max-w-[800px] mx-auto px-4 py-6 md:px-10 md:py-8">
      <div className="skeleton h-8 w-48 rounded mb-6" />
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
