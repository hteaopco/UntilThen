export default function CapsuleDetailLoading() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        <div className="h-4 w-20 rounded bg-navy/[0.06] animate-pulse" />

        {/* Title + status skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-64 rounded bg-navy/[0.06] animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-navy/[0.05] animate-pulse" />
        </div>

        {/* Info grid skeleton */}
        <div className="grid grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-navy/[0.06] bg-white/80 p-4 space-y-2">
              <div className="h-3 w-16 rounded bg-navy/[0.06] animate-pulse" />
              <div className="h-5 w-28 rounded bg-navy/[0.05] animate-pulse" />
            </div>
          ))}
        </div>

        {/* Contributions skeleton */}
        <div className="space-y-3">
          <div className="h-3 w-24 rounded bg-navy/[0.06] animate-pulse" />
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-navy/[0.06] bg-white/80 p-4 flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-full bg-navy/[0.06] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-navy/[0.06] animate-pulse" />
                <div className="h-3 w-48 rounded bg-navy/[0.04] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
