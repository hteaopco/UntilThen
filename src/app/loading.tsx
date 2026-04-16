import { Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center">
      <Loader2
        size={40}
        strokeWidth={1.75}
        className="text-amber animate-spin"
        aria-hidden="true"
      />
    </main>
  );
}
