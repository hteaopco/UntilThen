/**
 * Shared validation + diff helpers for the Employees CSV import.
 * Used by both /import/preview and /import/commit so the two
 * endpoints can never disagree on what counts as a valid row.
 *
 * Plain TS — no zod dependency. The shape is small (six fields)
 * and the validation rules are concrete; a hand-rolled validator
 * is easier to audit than a schema lib here.
 */

export type ImportRow = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string | null;
  subTeam: string | null;
};

export type RowError = { row: number; field?: string; message: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function trimOrNull(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0) return null;
  return t.length > max ? t.slice(0, max) : t;
}

function nonEmpty(v: unknown, max: number): string | null {
  const t = trimOrNull(v, max);
  return t === null ? null : t;
}

/**
 * Validates a parsed CSV row array (rows already split + JSON-ified
 * by the client). Returns the cleaned rows + the errors found.
 * Does NOT touch the database — callers diff/commit separately.
 *
 * Row indices are 1-based to match how a non-engineer reads a
 * spreadsheet row (the first data row is row 1, not row 0; the
 * header row is row 0 / not validated here).
 */
export function validateImportRows(input: unknown[]): {
  rows: ImportRow[];
  errors: RowError[];
} {
  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  const emailsSeen = new Map<string, number>();

  input.forEach((raw, i) => {
    const rowNum = i + 1;
    if (!raw || typeof raw !== "object") {
      errors.push({ row: rowNum, message: "row is not an object" });
      return;
    }
    const r = raw as Record<string, unknown>;

    const firstName = nonEmpty(r.firstName, 80);
    const lastName = nonEmpty(r.lastName, 80);
    const emailRaw = nonEmpty(r.email, 200);
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const phone = nonEmpty(r.phone, 40);
    const department = nonEmpty(r.department, 120);
    const subTeam = nonEmpty(r.subTeam, 120);

    if (!firstName) {
      errors.push({ row: rowNum, field: "firstName", message: "required" });
    }
    if (!lastName) {
      errors.push({ row: rowNum, field: "lastName", message: "required" });
    }
    if (!email) {
      errors.push({ row: rowNum, field: "email", message: "required" });
    } else if (!EMAIL_RE.test(email)) {
      errors.push({ row: rowNum, field: "email", message: "format invalid" });
    } else {
      const seenAt = emailsSeen.get(email);
      if (seenAt !== undefined) {
        errors.push({
          row: rowNum,
          field: "email",
          message: `duplicate of row ${seenAt} in this upload`,
        });
        return;
      }
      emailsSeen.set(email, rowNum);
    }

    if (!firstName || !lastName || !email || !EMAIL_RE.test(email)) return;

    rows.push({
      firstName,
      lastName,
      email,
      phone,
      department,
      subTeam,
    });
  });

  return { rows, errors };
}
