"use client";

import { Download, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";

type Mode = "ADD_NEW" | "OVERWRITE";

type Phase = "upload" | "preview" | "committing" | "done";

type CsvRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  subTeam: string | null;
};

type PreviewResp = {
  errors: { row: number; field?: string; message: string }[];
  newRows: CsvRow[];
  duplicates: { row: number; existingId: string; email: string }[];
  toDelete: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }[];
  counts: {
    total: number;
    valid: number;
    errors: number;
    newRows: number;
    duplicates: number;
    toDelete: number;
  };
};

/**
 * CSV import modal — drives the full upload → preview → commit
 * flow.
 *
 *   1. Upload phase — pick a CSV (downloaded from the template
 *      route) and a mode. We parse the file in the browser, then
 *      send the JSON rows to /import/preview.
 *   2. Preview phase — show a per-section summary (errors,
 *      new rows, duplicates, to-delete). The to-delete list is
 *      expandable with a checkbox per row; defaults to all-checked
 *      so the user can deselect anyone they want to keep before
 *      committing.
 *   3. Committing phase — POST /import with the explicit deleteIds
 *      derived from the still-checked rows.
 *   4. Done phase — quick "X added / Y updated / Z removed" recap.
 */
export function ImportModal({
  orgId,
  onClose,
  onCommitted,
}: {
  orgId: string;
  onClose: () => void;
  onCommitted: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("upload");
  const [mode, setMode] = useState<Mode>("ADD_NEW");
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResp | null>(null);
  const [parsedRows, setParsedRows] = useState<CsvRow[]>([]);
  const [deleteSelection, setDeleteSelection] = useState<Set<string>>(
    new Set(),
  );
  const [revalidating, setRevalidating] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    deleted: number;
  } | null>(null);

  async function runPreview(rows: CsvRow[]) {
    setError(null);
    if (rows.length === 0) {
      setError("No rows left to import.");
      return;
    }
    const res = await fetch(
      `/api/orgs/${orgId}/employees/import/preview`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(data.error ?? "Couldn't preview the import.");
    }
    const body = (await res.json()) as PreviewResp;
    setParsedRows(rows);
    setPreview(body);
    setDeleteSelection(new Set(body.toDelete.map((r) => r.id)));
  }

  async function handleFile(file: File) {
    setError(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setError("Couldn't read that file.");
      return;
    }
    let rows: CsvRow[];
    try {
      rows = parseCsv(text);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    if (rows.length === 0) {
      setError("No rows found in that CSV.");
      return;
    }
    try {
      await runPreview(rows);
      setPhase("preview");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  // Inline edits update parsedRows but don't re-fetch preview —
  // the user clicks "Re-check" once they're done editing so we
  // don't hammer /preview on every keystroke.
  function editField(idx: number, field: keyof CsvRow, value: string) {
    setParsedRows((prev) =>
      prev.map((r, i) =>
        i === idx
          ? {
              ...r,
              [field]:
                field === "phone" || field === "department" || field === "subTeam"
                  ? value || null
                  : value,
            }
          : r,
      ),
    );
  }

  // Skip drops the row entirely, then re-runs preview so row
  // numbers / counts / toDelete all stay consistent with what's
  // about to be committed.
  async function skipRow(idx: number) {
    const next = parsedRows.filter((_, i) => i !== idx);
    setRevalidating(true);
    try {
      await runPreview(next);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevalidating(false);
    }
  }

  async function revalidate() {
    setRevalidating(true);
    try {
      await runPreview(parsedRows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRevalidating(false);
    }
  }

  function toggleDelete(id: string) {
    const next = new Set(deleteSelection);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDeleteSelection(next);
  }

  async function commit() {
    if (!preview) return;
    setPhase("committing");
    setError(null);
    try {
      const res = await fetch(`/api/orgs/${orgId}/employees/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          rows: parsedRows,
          deleteIds: mode === "OVERWRITE" ? Array.from(deleteSelection) : [],
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Import failed.");
      }
      const body = (await res.json()) as {
        inserted: number;
        updated: number;
        deleted: number;
      };
      setResult(body);
      setPhase("done");
      onCommitted();
    } catch (err) {
      setError((err as Error).message);
      setPhase("preview");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[640px] max-h-[90vh] flex flex-col"
      >
        <div className="px-6 pt-6 pb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.2px]">
            Import employees
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink-mid hover:text-navy"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {phase === "upload" && (
            <UploadPhase
              orgId={orgId}
              mode={mode}
              setMode={setMode}
              onFile={handleFile}
              error={error}
            />
          )}
          {phase === "preview" && preview && (
            <PreviewPhase
              mode={mode}
              preview={preview}
              parsedRows={parsedRows}
              deleteSelection={deleteSelection}
              onToggleDelete={toggleDelete}
              onCommit={commit}
              onBack={() => {
                setPhase("upload");
                setPreview(null);
                setError(null);
              }}
              onEditField={editField}
              onSkipRow={skipRow}
              onRevalidate={revalidate}
              revalidating={revalidating}
              error={error}
            />
          )}
          {phase === "committing" && (
            <p className="py-10 text-center text-[14px] text-ink-mid">
              Applying changes…
            </p>
          )}
          {phase === "done" && result && (
            <DonePhase result={result} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function UploadPhase({
  orgId,
  mode,
  setMode,
  onFile,
  error,
}: {
  orgId: string;
  mode: Mode;
  setMode: (m: Mode) => void;
  onFile: (file: File) => void;
  error: string | null;
}) {
  return (
    <div>
      <p className="text-[13px] text-ink-mid leading-[1.55]">
        Columns are read by position — the header row is optional.{" "}
        Order:{" "}
        <code className="text-[12px] bg-navy/[0.05] px-1.5 py-0.5 rounded">
          firstName, lastName, email, phone, department, subTeam
        </code>
        . You&rsquo;ll see the rows on the next screen, so it&rsquo;s
        easy to catch a misaligned column. Email is required and used
        as the natural key for duplicate detection.
      </p>

      <a
        href={`/api/orgs/${orgId}/employees/template`}
        download
        className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-dark hover:text-amber transition-colors"
      >
        <Download size={12} strokeWidth={2.25} aria-hidden="true" />
        Download CSV template
      </a>

      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-2">
          Mode
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ModeCard
            active={mode === "ADD_NEW"}
            onClick={() => setMode("ADD_NEW")}
            title="Add new"
            body="Insert rows whose email isn't already in the database. Existing rows stay untouched."
          />
          <ModeCard
            active={mode === "OVERWRITE"}
            onClick={() => setMode("OVERWRITE")}
            title="Overwrite"
            body="Insert new rows, update matching ones, and remove employees not on the upload (review list first)."
          />
        </div>
      </div>

      <label className="mt-5 block cursor-pointer">
        <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid mb-2">
          CSV file
        </p>
        <div className="rounded-xl border-2 border-dashed border-navy/15 bg-cream px-4 py-6 text-center hover:border-amber/50 transition-colors cursor-pointer">
          <Upload
            size={22}
            strokeWidth={1.75}
            className="mx-auto text-ink-mid"
            aria-hidden="true"
          />
          <p className="mt-2 text-[13px] text-ink-mid">
            Drop a CSV here or click to browse
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              // Reset so re-selecting the same filename re-fires
              // the change event.
              e.target.value = "";
            }}
            className="sr-only"
          />
        </div>
      </label>

      {error && (
        <p className="mt-3 text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border px-4 py-3 transition-colors ${
        active
          ? "border-amber bg-amber-tint/40"
          : "border-navy/15 bg-white hover:border-navy/30"
      }`}
    >
      <p className="text-[13px] font-bold text-navy">{title}</p>
      <p className="mt-1 text-[12px] text-ink-mid leading-[1.45]">{body}</p>
    </button>
  );
}

function PreviewPhase({
  mode,
  preview,
  parsedRows,
  deleteSelection,
  onToggleDelete,
  onCommit,
  onBack,
  onEditField,
  onSkipRow,
  onRevalidate,
  revalidating,
  error,
}: {
  mode: Mode;
  preview: PreviewResp;
  parsedRows: CsvRow[];
  deleteSelection: Set<string>;
  onToggleDelete: (id: string) => void;
  onCommit: () => void;
  onBack: () => void;
  onEditField: (idx: number, field: keyof CsvRow, value: string) => void;
  onSkipRow: (idx: number) => void;
  onRevalidate: () => void;
  revalidating: boolean;
  error: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const [errorsExpanded, setErrorsExpanded] = useState(true);

  const willDelete = deleteSelection.size;
  const willAdd = preview.newRows.length;
  const willUpdate = mode === "OVERWRITE" ? preview.duplicates.length : 0;
  const willSkip = mode === "ADD_NEW" ? preview.duplicates.length : 0;

  const blockedByErrors = preview.errors.length > 0;

  // Group errors by 1-based row number so each errored row is
  // rendered once with the union of its problems (e.g. row 17
  // missing both firstName and email shows both messages on the
  // same edit form, not as two separate cards).
  const errorsByRow = useMemo(() => {
    const map = new Map<number, { row: number; field?: string; message: string }[]>();
    for (const e of preview.errors) {
      const arr = map.get(e.row) ?? [];
      arr.push(e);
      map.set(e.row, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([row, errs]) => ({ row, errs }));
  }, [preview.errors]);

  return (
    <div>
      <Summary label="Will be added" count={willAdd} tone="positive" />
      {mode === "OVERWRITE" ? (
        <Summary label="Will be updated" count={willUpdate} tone="neutral" />
      ) : (
        <Summary
          label="Already in database (skipped)"
          count={willSkip}
          tone="muted"
        />
      )}
      {mode === "OVERWRITE" && (
        <div>
          <Summary
            label="Will be removed"
            count={willDelete}
            total={preview.toDelete.length}
            tone="warning"
            expandable={preview.toDelete.length > 0}
            expanded={expanded}
            onToggle={() => setExpanded(!expanded)}
          />
          {expanded && preview.toDelete.length > 0 && (
            <div className="ml-6 mb-3 border border-navy/[0.08] rounded-lg bg-warm-surface/30 max-h-[260px] overflow-y-auto">
              {preview.toDelete.map((r) => (
                <label
                  key={r.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-white border-b border-navy/[0.04] last:border-0 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={deleteSelection.has(r.id)}
                    onChange={() => onToggleDelete(r.id)}
                    className="rounded"
                  />
                  <span className="text-[13px] text-navy font-bold">
                    {r.firstName} {r.lastName}
                  </span>
                  <span className="text-[12px] text-ink-mid">{r.email}</span>
                </label>
              ))}
            </div>
          )}
          {preview.toDelete.length > 0 && (
            <p className="ml-6 mt-1 text-[11px] text-ink-light">
              Uncheck anyone you want to keep. Default is all-selected.
            </p>
          )}
        </div>
      )}

      {preview.errors.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <button
            type="button"
            onClick={() => setErrorsExpanded((v) => !v)}
            className="w-full flex items-center justify-between text-left"
            aria-expanded={errorsExpanded}
          >
            <span className="text-[12px] font-bold text-red-700">
              <span aria-hidden="true">{errorsExpanded ? "▾" : "▸"}</span>{" "}
              {errorsByRow.length}{" "}
              {errorsByRow.length === 1 ? "row needs" : "rows need"} fixing
              before import
            </span>
            <span className="text-[11px] text-red-700/80 underline">
              {errorsExpanded ? "Hide" : "View errors"}
            </span>
          </button>

          {errorsExpanded && (
            <div className="mt-2 space-y-2 max-h-[320px] overflow-y-auto">
              {errorsByRow.map(({ row, errs }) => {
                const idx = row - 1;
                const r = parsedRows[idx];
                if (!r) return null;
                return (
                  <div
                    key={row}
                    className="rounded-md border border-red-200 bg-white px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] uppercase tracking-[0.08em] font-bold text-red-700">
                        Row {row}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSkipRow(idx)}
                        disabled={revalidating}
                        className="text-[11px] font-bold text-ink-mid hover:text-red-600 underline disabled:opacity-50"
                      >
                        Skip this row
                      </button>
                    </div>
                    <p className="text-[11px] text-red-700 mb-2">
                      {errs
                        .map((e) =>
                          e.field ? `${e.field}: ${e.message}` : e.message,
                        )
                        .join(" · ")}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <ErrorField
                        label="First"
                        value={r.firstName}
                        onChange={(v) => onEditField(idx, "firstName", v)}
                      />
                      <ErrorField
                        label="Last"
                        value={r.lastName}
                        onChange={(v) => onEditField(idx, "lastName", v)}
                      />
                      <ErrorField
                        label="Email"
                        value={r.email}
                        onChange={(v) => onEditField(idx, "email", v)}
                      />
                      <ErrorField
                        label="Phone"
                        value={r.phone ?? ""}
                        onChange={(v) => onEditField(idx, "phone", v)}
                      />
                      <ErrorField
                        label="Department"
                        value={r.department ?? ""}
                        onChange={(v) => onEditField(idx, "department", v)}
                      />
                      <ErrorField
                        label="Sub team"
                        value={r.subTeam ?? ""}
                        onChange={(v) => onEditField(idx, "subTeam", v)}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={onRevalidate}
                  disabled={revalidating}
                  className="px-3 py-1.5 rounded-md text-[12px] font-bold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  {revalidating ? "Re-checking…" : "Re-check"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold border border-navy/15 text-ink-mid hover:text-navy hover:border-navy/30 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onCommit}
          disabled={blockedByErrors}
          className="px-4 py-2 rounded-lg text-[13px] font-bold bg-amber text-white hover:bg-amber-dark transition-colors disabled:opacity-60"
        >
          {blockedByErrors ? "Fix errors first" : "Confirm import"}
        </button>
      </div>
    </div>
  );
}

function ErrorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.08em] font-bold text-ink-mid mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1 rounded border border-navy/15 bg-white text-[12px] text-navy outline-none focus:border-amber focus:ring-1 focus:ring-amber/30"
      />
    </label>
  );
}

function Summary({
  label,
  count,
  total,
  tone,
  expandable,
  expanded,
  onToggle,
}: {
  label: string;
  count: number;
  total?: number;
  tone: "positive" | "neutral" | "warning" | "muted";
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const colors: Record<string, string> = {
    positive: "text-sage",
    neutral: "text-navy",
    warning: "text-red-600",
    muted: "text-ink-mid",
  };
  return (
    <div className="flex items-center gap-2 py-1.5">
      <button
        type="button"
        onClick={expandable ? onToggle : undefined}
        disabled={!expandable}
        className={`text-[12px] uppercase tracking-[0.08em] font-bold flex items-center gap-1 ${
          expandable ? "hover:text-navy cursor-pointer" : "cursor-default"
        } ${colors[tone]}`}
      >
        {expandable && (
          <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
        )}
        <span className={`text-[18px] ${colors[tone]}`}>
          {count}
          {total !== undefined && total !== count ? ` of ${total}` : ""}
        </span>
        <span className="ml-1">{label}</span>
      </button>
    </div>
  );
}

function DonePhase({
  result,
  onClose,
}: {
  result: { inserted: number; updated: number; deleted: number };
  onClose: () => void;
}) {
  return (
    <div className="text-center py-6">
      <p className="text-[20px] font-extrabold text-navy">Import complete</p>
      <ul className="mt-4 inline-block text-left text-[13px] text-ink-mid space-y-1">
        <li>
          <span className="font-bold text-sage">{result.inserted}</span> added
        </li>
        <li>
          <span className="font-bold text-navy">{result.updated}</span> updated
        </li>
        <li>
          <span className="font-bold text-red-600">{result.deleted}</span>{" "}
          removed
        </li>
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 inline-flex items-center justify-center px-5 py-2 rounded-lg text-[13px] font-bold bg-amber text-white hover:bg-amber-dark transition-colors"
      >
        Done
      </button>
    </div>
  );
}

/**
 * Tiny CSV parser. The mapping is positional (not header-name
 * dependent) so common spreadsheet quirks — renamed columns,
 * translated headers, no header at all — never block an import:
 *
 *   col 0 → firstName
 *   col 1 → lastName
 *   col 2 → email
 *   col 3 → phone
 *   col 4 → department
 *   col 5 → subTeam
 *
 * The first row is treated as a header and skipped iff it looks
 * like one (no "@" in col 2, and at least one cell matches a
 * known label like "email" / "first name"). Otherwise every row
 * is data. Quoted fields with embedded commas / escaped quotes
 * ("") are handled.
 */
function parseCsv(text: string): CsvRow[] {
  const lines = splitCsvLines(text);
  if (lines.length === 0) return [];

  const firstCells = parseCsvLine(lines[0]).map((c) => c.trim());
  const startIdx = looksLikeHeader(firstCells) ? 1 : 0;

  const out: CsvRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const cells = parseCsvLine(raw);
    out.push({
      firstName: (cells[0] ?? "").trim(),
      lastName: (cells[1] ?? "").trim(),
      email: (cells[2] ?? "").trim(),
      phone: (cells[3] ?? "").trim() || null,
      department: (cells[4] ?? "").trim() || null,
      subTeam: (cells[5] ?? "").trim() || null,
    });
  }
  return out;
}

const HEADER_LABELS = new Set([
  "firstname",
  "first name",
  "first",
  "lastname",
  "last name",
  "last",
  "email",
  "e-mail",
  "phone",
  "phone number",
  "mobile",
  "department",
  "dept",
  "subteam",
  "sub team",
  "team",
]);

function looksLikeHeader(cells: string[]): boolean {
  // Email column with an "@" guarantees it's data, not a header —
  // if col 2 is something like "alice@acme.com" we never strip
  // row 0, even if other cells match label words by coincidence.
  const emailCell = (cells[2] ?? "").toLowerCase();
  if (emailCell.includes("@")) return false;
  return cells.some((c) => HEADER_LABELS.has(c.toLowerCase().trim()));
}

/** Splits a CSV blob into logical rows, respecting embedded \n
 *  inside quoted cells. */
function splitCsvLines(text: string): string[] {
  const lines: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      // Doubled quote inside a quoted field is an escape, not a
      // quote-toggle.
      if (inQuote && text[i + 1] === '"') {
        cur += '""';
        i++;
        continue;
      }
      inQuote = !inQuote;
      cur += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) lines.push(cur);
  return lines;
}

/** Parses a single row, splitting on unquoted commas + unescaping
 *  doubled quotes inside quoted cells. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}
