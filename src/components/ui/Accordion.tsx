"use client";

import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
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
  /** When true, renders an "Expand all / Collapse all" toggle
   *  above the sections. Off by default so the global /faq keeps
   *  its current behaviour; the product-scoped FAQs (wedding +
   *  enterprise) opt in. */
  showExpandAll?: boolean;
}

// Grouped accordion: each section has a small sky-blue eyebrow label
// above its questions. Clicking a question opens it and closes any
// other open question across every section (only one open at a time).
// When `showExpandAll` is on, an "Expand all" toggle overrides that
// single-open behavior and opens every row at once.
export function Accordion({ sections, showExpandAll = false }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [allOpen, setAllOpen] = useState(false);

  return (
    <div>
      {showExpandAll && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              setAllOpen((v) => !v);
              setOpenKey(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-navy/10 text-navy/70 text-[12px] font-bold hover:border-amber/40 hover:text-navy transition-colors"
          >
            {allOpen ? (
              <>
                <ChevronsDownUp
                  size={12}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                Collapse all
              </>
            ) : (
              <>
                <ChevronsUpDown
                  size={12}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                Expand all
              </>
            )}
          </button>
        </div>
      )}
      {sections.map((section, si) => (
        <div key={section.label} className={si === 0 ? "mt-6" : "mt-14"}>
          <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber mb-2">
            {section.label}
          </h2>
          <div>
            {section.items.map((item, ii) => {
              const key = `${si}-${ii}`;
              const isOpen = allOpen || openKey === key;
              return (
                <AccordionRow
                  key={key}
                  item={item}
                  isOpen={isOpen}
                  onToggle={() => {
                    if (allOpen) {
                      // Leaving "expand all" mode by tapping any
                      // single row. Pin that row open, collapse
                      // everything else — feels less jarring than
                      // collapsing the row the user just clicked.
                      setAllOpen(false);
                      setOpenKey(key);
                      return;
                    }
                    setOpenKey(isOpen ? null : key);
                  }}
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
    <ChevronDown
      size={20}
      strokeWidth={1.75}
      aria-hidden="true"
      className={`shrink-0 text-amber transition-transform duration-[250ms] ease-out ${
        open ? "rotate-180" : ""
      }`}
    />
  );
}
