export default function CapsulesLoading() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-navy/[0.06] animate-pulse" />
          <div className="h-7 w-56 rounded bg-navy/[0.06] animate-pulse" />
        </div>

        {/* Status badges skeleton */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-7 w-20 rounded-full bg-navy/[0.05] animate-pulse"
            />
          ))}
        </div>

        {/* Content cards skeleton */}
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-navy/[0.06] bg-white/80 p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-44 rounded bg-navy/[0.06] animate-pulse" />
                <div className="h-5 w-16 rounded-full bg-navy/[0.05] animate-pulse" />
              </div>
              <div className="h-3 w-32 rounded bg-navy/[0.04] animate-pulse" />
              <div className="flex gap-4">
                <div className="h-3 w-20 rounded bg-navy/[0.04] animate-pulse" />
                <div className="h-3 w-20 rounded bg-navy/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
