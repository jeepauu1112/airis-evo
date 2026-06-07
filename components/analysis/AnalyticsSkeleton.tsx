function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/10 ${className}`} />;
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonBlock key={index} className="h-36" />
        ))}
      </div>
      <SkeletonBlock className="h-28" />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <SkeletonBlock className="h-[420px]" />
        <SkeletonBlock className="h-[420px]" />
      </div>
    </div>
  );
}
