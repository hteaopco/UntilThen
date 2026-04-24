"use client";

import { useState } from "react";

type SuccessResponse = {
  success: true;
  key: string;
  bytes: number;
  durationMs: number;
};
type ErrorResponse = { success: false; error: string };
type Response = SuccessResponse | ErrorResponse;

type Outcome =
  | { kind: "idle" }
  | { kind: "running" }
  | ({ kind: "done"; at: string } & Response);

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`;
}

export function DbBackupTestButton() {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function fire() {
    setOutcome({ kind: "running" });
    try {
      const res = await fetch("/api/admin/db-backup-test", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as Partial<Response> & {
        error?: string;
      };
      if (res.ok && data.success === true && "key" in data) {
        setOutcome({
          kind: "done",
          at: new Date().toISOString(),
          success: true,
          key: data.key!,
          bytes: data.bytes!,
          durationMs: data.durationMs!,
        });
      } else {
        setOutcome({
          kind: "done",
          at: new Date().toISOString(),
          success: false,
          error:
            data.error ??
            `Unexpected status ${res.status}. Check Deploy Logs for [cron/db-backup] or [admin/db-backup-test] lines.`,
        });
      }
    } catch (err) {
      setOutcome({
        kind: "done",
        at: new Date().toISOString(),
        success: false,
        error: (err as Error).message ?? "Network error.",
      });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={fire}
        disabled={outcome.kind === "running"}
        className="bg-navy text-white rounded-md px-4 py-2.5 text-[13px] font-bold hover:bg-navy/90 disabled:opacity-50"
      >
        {outcome.kind === "running"
          ? "Running pg_dump (may take several minutes)…"
          : "Fire db-backup"}
      </button>

      {outcome.kind === "done" && outcome.success ? (
        <div className="mt-3 rounded-md border border-sage/30 bg-sage-tint/50 px-3 py-2 text-[13px]">
          <p className="font-bold text-navy">Backup uploaded to R2.</p>
          <ul className="text-ink-mid leading-[1.55] mt-1 text-[12px] font-mono">
            <li>
              Key: <span className="text-navy break-all">{outcome.key}</span>
            </li>
            <li>
              Size: <span className="text-navy">{formatBytes(outcome.bytes)}</span>{" "}
              ({outcome.bytes.toLocaleString()} bytes)
            </li>
            <li>
              Duration:{" "}
              <span className="text-navy">
                {formatDuration(outcome.durationMs)}
              </span>
            </li>
          </ul>
        </div>
      ) : null}

      {outcome.kind === "done" && !outcome.success ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          <p className="font-bold">Backup failed.</p>
          <p className="text-[12px] mt-1 font-mono break-all">{outcome.error}</p>
        </div>
      ) : null}
    </div>
  );
}
