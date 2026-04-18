export default function ContributeLoading() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-[440px] text-center space-y-6">
        <div className="h-5 w-24 rounded bg-navy/[0.06] animate-pulse mx-auto" />
        <div className="h-8 w-64 rounded bg-navy/[0.06] animate-pulse mx-auto" />
        <div className="h-4 w-48 rounded bg-navy/[0.05] animate-pulse mx-auto" />
        <div className="h-12 w-40 rounded-xl bg-amber/10 animate-pulse mx-auto" />
      </div>
    </main>
  );
}
