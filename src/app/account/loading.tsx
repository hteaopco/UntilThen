import { Loader2 } from "lucide-react";

export default function AccountLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2
        size={32}
        strokeWidth={1.75}
        className="text-amber animate-spin"
        aria-hidden="true"
      />
    </div>
  );
}
