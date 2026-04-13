export function Divider() {
  return (
    <div className="mx-auto max-w-[1280px] px-6 lg:px-14">
      <div className="flex items-center gap-5">
        <div className="h-px flex-1 bg-navy/[0.08]" />
        <div
          className="w-[6px] h-[6px] rounded-full bg-gold shrink-0"
          aria-hidden="true"
        />
        <div className="h-px flex-1 bg-navy/[0.08]" />
      </div>
    </div>
  );
}
