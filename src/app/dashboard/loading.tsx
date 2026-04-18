export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-cream">
      {/* Top bar skeleton */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between max-w-3xl mx-auto">
        <div className="h-4 w-24 rounded bg-navy/[0.06] animate-pulse" />
        <div className="h-8 w-8 rounded-full bg-navy/[0.06] animate-pulse" />
      </div>

      <div className="max-w-3xl mx-auto px-6 space-y-8 pb-20">
        {/* Hero skeleton */}
        <div className="rounded-2xl bg-white/70 border border-navy/[0.06] p-6 space-y-4">
          <div className="h-6 w-48 rounded bg-navy/[0.06] animate-pulse" />
          <div className="h-4 w-64 rounded bg-navy/[0.05] animate-pulse" />
          <div className="flex gap-3 mt-4">
            <div className="h-10 w-32 rounded-lg bg-amber/10 animate-pulse" />
            <div className="h-10 w-28 rounded-lg bg-navy/[0.04] animate-pulse" />
          </div>
        </div>

        {/* Capsule cards skeleton */}
        <div>
          <div className="h-3 w-20 rounded bg-navy/[0.06] animate-pulse mb-4" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="shrink-0 w-[220px] h-[140px] rounded-xl bg-white/60 border border-navy/[0.06] animate-pulse"
              />
            ))}
          </div>
        </div>

        {/* Entry list skeleton */}
        <div>
          <div className="h-3 w-16 rounded bg-navy/[0.06] animate-pulse mb-4" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-navy/[0.06] bg-white/80 px-4 py-3"
              >
                <div className="h-8 w-8 rounded-full bg-navy/[0.06] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-navy/[0.06] animate-pulse" />
                  <div className="h-3 w-24 rounded bg-navy/[0.04] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
