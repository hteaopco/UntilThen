import { QuillSvg } from "@/components/ui/QuillSvg";

export function QuillDivider() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center gap-6">
        <div className="h-px flex-1 bg-ink/10" />
        <QuillSvg
          width={28}
          height={46}
          color="#c05a3a"
          opacity={1}
          className="shrink-0"
        />
        <div className="h-px flex-1 bg-ink/10" />
      </div>
    </div>
  );
}
