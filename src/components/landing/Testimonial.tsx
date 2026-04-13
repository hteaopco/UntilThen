import { QuillSvg } from "@/components/ui/QuillSvg";

export function Testimonial() {
  return (
    <section className="bg-sand py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <div className="flex justify-center">
          <QuillSvg width={32} height={52} color="#c05a3a" opacity={1} />
        </div>
        <blockquote className="mt-8 text-2xl lg:text-[32px] font-medium text-ink leading-[1.35] tracking-[-0.01em]">
          &ldquo;I wrote my daughter a letter the night she was born. I sealed
          it for her 18th birthday. The idea that she&rsquo;ll open it someday
          and hear who I was in that moment — I can&rsquo;t think of anything
          more meaningful.&rdquo;
        </blockquote>
        <div className="mt-8 text-sm text-ink/55">
          <span className="font-semibold text-ink">Sarah K.</span> · Early
          Access · Mother of two
        </div>
      </div>
    </section>
  );
}
