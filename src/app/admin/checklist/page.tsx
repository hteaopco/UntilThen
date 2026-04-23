import { readFile } from "node:fs/promises";
import path from "node:path";

import { AdminHeader } from "@/app/admin/AdminHeader";

export const metadata = {
  title: "Checklist — untilThen Admin",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Renders `docs/pre-launch-checklist.md` inside the admin shell
 * so the owner can pull up the latest launch status from any
 * device without digging through the repo. Source of truth stays
 * the checked-in markdown file — this page is read-only.
 *
 * Uses a small handwritten renderer instead of a full markdown
 * library. The checklist only leans on a specific subset of
 * GitHub-flavored markdown (headings, task lists, tables, inline
 * code, emphasis, hr), and adding `remark-gfm` for one admin
 * page isn't worth the dep weight.
 */
export default async function AdminChecklistPage() {
  let markdown: string;
  try {
    const filePath = path.join(
      process.cwd(),
      "docs",
      "pre-launch-checklist.md",
    );
    markdown = await readFile(filePath, "utf8");
  } catch (err) {
    console.error("[admin/checklist] read failed:", err);
    markdown =
      "# Checklist missing\n\nCouldn't read `docs/pre-launch-checklist.md` from disk.";
  }

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <AdminHeader />
        <article className="space-y-1">{renderChecklist(markdown)}</article>
      </div>
    </main>
  );
}

type Block =
  | { kind: "h1" | "h2" | "h3"; text: string }
  | { kind: "hr" }
  | { kind: "p"; text: string }
  | { kind: "code"; text: string }
  | {
      kind: "list";
      items: Array<{
        check: "done" | "todo" | "partial" | null;
        html: string;
      }>;
    }
  | { kind: "table"; header: string[]; rows: string[][] };

/**
 * Split the source into top-level blocks, then render each.
 * Everything keeps a predictable vertical rhythm by rendering
 * through Tailwind classes so the page inherits the app's type
 * system — no escape into raw <style> needed.
 */
function renderChecklist(source: string): React.ReactNode[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    // Fenced code block — pass through verbatim.
    if (trimmed.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ kind: "code", text: buf.join("\n") });
      continue;
    }

    if (trimmed === "---") {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ kind: "h3", text: trimmed.slice(4) });
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ kind: "h2", text: trimmed.slice(3) });
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ kind: "h1", text: trimmed.slice(2) });
      i++;
      continue;
    }

    // Table — a header row, a divider row, then data rows.
    if (trimmed.startsWith("|") && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (/^\|[\s\-:|]+\|$/.test(next)) {
        const header = splitTableRow(trimmed);
        const rows: string[][] = [];
        i += 2;
        while (i < lines.length && lines[i].trim().startsWith("|")) {
          rows.push(splitTableRow(lines[i].trim()));
          i++;
        }
        blocks.push({ kind: "table", header, rows });
        continue;
      }
    }

    // List (checklist items + plain bullets).
    if (/^[-*]\s+/.test(trimmed)) {
      const items: Array<{
        check: "done" | "todo" | "partial" | null;
        html: string;
      }> = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const t = lines[i].trim().replace(/^[-*]\s+/, "");
        // "[x] ..." | "[ ] ..." | "[~] ..."
        if (/^\[[ xX~]\]\s*/.test(t)) {
          const marker = t[1];
          const rest = t.replace(/^\[[ xX~]\]\s*/, "");
          items.push({
            check:
              marker === "x" || marker === "X"
                ? "done"
                : marker === "~"
                  ? "partial"
                  : "todo",
            html: renderInline(rest),
          });
        } else {
          items.push({ check: null, html: renderInline(t) });
        }
        i++;
      }
      blocks.push({ kind: "list", items });
      continue;
    }

    // Anything else is a paragraph. Absorb contiguous non-blank
    // lines so soft-wrapped prose joins back up.
    const buf: string[] = [trimmed];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^[#\-*|]|^---$|^```/.test(lines[i].trim())
    ) {
      buf.push(lines[i].trim());
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }

  return blocks.map((b, idx) => renderBlock(b, idx));
}

function renderBlock(b: Block, key: number): React.ReactNode {
  switch (b.kind) {
    case "h1":
      return (
        <h1
          key={key}
          className="text-[28px] font-extrabold text-navy tracking-[-0.5px] mt-10 first:mt-0 mb-4"
        >
          <span dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
        </h1>
      );
    case "h2":
      return (
        <h2
          key={key}
          className="text-[20px] font-extrabold text-navy mt-10 mb-3 pb-1.5 border-b border-navy/10"
        >
          <span dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
        </h2>
      );
    case "h3":
      return (
        <h3
          key={key}
          className="text-[12px] uppercase tracking-[0.1em] font-bold text-navy mt-6 mb-2"
        >
          <span dangerouslySetInnerHTML={{ __html: renderInline(b.text) }} />
        </h3>
      );
    case "hr":
      return <hr key={key} className="my-7 border-t border-navy/[0.08]" />;
    case "p":
      return (
        <p
          key={key}
          className="text-[14px] leading-[1.6] text-ink-mid mb-3"
          dangerouslySetInnerHTML={{ __html: renderInline(b.text) }}
        />
      );
    case "code":
      return (
        <pre
          key={key}
          className="bg-navy text-cream rounded-lg px-4 py-3 my-3 overflow-x-auto text-[12.5px] leading-[1.55] font-mono"
        >
          <code>{b.text}</code>
        </pre>
      );
    case "list":
      return (
        <ul key={key} className="space-y-1.5 mb-3">
          {b.items.map((it, liIdx) => (
            <li
              key={liIdx}
              className="flex items-start gap-2 text-[14px] leading-[1.55] text-ink-mid"
            >
              {it.check === null ? (
                <span className="text-amber mt-1.5 shrink-0">•</span>
              ) : (
                <CheckMarker state={it.check} />
              )}
              <span
                className={
                  it.check === "done" ? "text-ink-light line-through" : ""
                }
                dangerouslySetInnerHTML={{ __html: it.html }}
              />
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div key={key} className="my-3 overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr>
                {b.header.map((cell, cIdx) => (
                  <th
                    key={cIdx}
                    className="text-left px-3 py-2 bg-navy/[0.03] font-bold text-navy border-b border-navy/10"
                    dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-3 py-2 border-b border-navy/[0.06] text-ink-mid align-top"
                      dangerouslySetInnerHTML={{ __html: renderInline(cell) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function CheckMarker({
  state,
}: {
  state: "done" | "todo" | "partial";
}): React.ReactElement {
  const base =
    "mt-1 shrink-0 w-[14px] h-[14px] rounded-[3px] border-[1.5px] flex items-center justify-center";
  if (state === "done") {
    return (
      <span
        className={`${base} border-amber bg-amber text-white text-[10px] leading-none`}
        aria-label="Done"
      >
        ✓
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span
        className={`${base} border-amber bg-amber/30 text-amber-dark text-[10px] leading-none`}
        aria-label="In progress"
      >
        ~
      </span>
    );
  }
  return (
    <span
      className={`${base} border-navy/30 bg-transparent`}
      aria-label="Todo"
    />
  );
}

/**
 * Inline markdown → HTML. Handles the specific flavours used in
 * the checklist: **bold**, *em* / _em_, `code`, and bare URLs.
 * Escapes HTML first so arbitrary markdown text can't inject a
 * script tag into the page.
 */
function renderInline(text: string): string {
  let t = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Code spans — replace first so the backticked content doesn't
  // get further mangled by the emphasis passes.
  t = t.replace(
    /`([^`]+)`/g,
    '<code class="font-mono text-[12.5px] bg-amber/10 text-navy px-1.5 py-0.5 rounded">$1</code>',
  );
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-navy font-bold">$1</strong>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em class="italic">$2</em>');
  t = t.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em class="italic">$2</em>');
  return t;
}

function splitTableRow(line: string): string[] {
  // Strip leading/trailing pipes and split. Doesn't support
  // escaped pipes — the checklist doesn't use them.
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}
