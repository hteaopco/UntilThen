export default function AccountLoading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-14 rounded bg-navy/[0.06] animate-pulse" />
        <div className="h-7 w-40 rounded bg-navy/[0.06] animate-pulse" />
      </div>

      {/* Profile section skeleton */}
      <div className="rounded-xl border border-navy/[0.06] bg-white/80 p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-navy/[0.06] animate-pulse shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-36 rounded bg-navy/[0.06] animate-pulse" />
            <div className="h-3 w-48 rounded bg-navy/[0.04] animate-pulse" />
          </div>
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 rounded bg-navy/[0.06] animate-pulse" />
            <div className="h-10 w-full rounded-lg bg-navy/[0.04] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Actions skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-28 rounded-lg bg-navy/[0.05] animate-pulse" />
        <div className="h-10 w-28 rounded-lg bg-navy/[0.05] animate-pulse" />
      </div>
    </div>
  );
}
