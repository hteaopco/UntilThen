"use client";

import { useState } from "react";

export type AccordionItem = {
  question: string;
  answer: string;
};

export type AccordionSection = {
  label: string;
  items: AccordionItem[];
};

interface Props {
  sections: AccordionSection[];
}

// Grouped accordion: each section has a small sky-blue eyebrow label
// above its questions. Clicking a question opens it and closes any
// other open question across every section (only one open at a time).
export function Accordion({ sections }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div>
      {sections.map((section, si) => (
        <div key={section.label} className={si === 0 ? "mt-10" : "mt-14"}>
          <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase text-sky mb-2">
            {section.label}
          </h2>
          <div>
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              const isOpen = openKey === key;
              return (
                <AccordionRow
                  key={key}
                  item={item}
                  isOpen={isOpen}
                  onToggle={() => setOpenKey(isOpen ? null : key)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AccordionRow({
  item,
  isOpen,
  onToggle,
}: {
  item: AccordionItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-navy/[0.08]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between gap-4 py-5 min-h-[44px] text-left bg-transparent border-0 cursor-pointer"
      >
        <span className="text-base font-semibold text-navy leading-snug">
          {item.question}
        </span>
        <Chevron open={isOpen} />
      </button>
      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: isOpen ? "1000px" : "0" }}
        aria-hidden={!isOpen}
      >
        <p className="text-[15px] text-ink-mid leading-[1.75] font-normal pb-5 max-w-[640px] whitespace-pre-line">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-[250ms] ease-out"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="#4a9edd"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
