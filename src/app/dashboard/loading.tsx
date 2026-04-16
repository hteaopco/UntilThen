import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2
          size={40}
          strokeWidth={1.75}
          className="text-amber animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm italic text-ink-mid">Opening your vault&hellip;</p>
      </div>
    </main>
  );
}
