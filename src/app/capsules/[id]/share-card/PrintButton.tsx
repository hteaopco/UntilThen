"use client";

/**
 * Tiny client-only Print pill. Lives in its own component so the
 * parent page can stay a server component.
 *
 * Style + copy come from the design spec — solid amber pill,
 * white text, no icon. Hidden in print output by the parent's
 * print:hidden wrapper.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-[#c1844f] px-5 py-2 text-white font-semibold shadow-md"
    >
      Print
    </button>
  );
}
