"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Outcome =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success"; bytes: number; contentType: string }
  | { kind: "error"; message: string };

export function StockVoiceUpload({ voiceKey }: { voiceKey: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setOutcome({ kind: "uploading" });
    try {
      const form = new FormData();
      form.set("key", voiceKey);
      form.set("file", file);
      const res = await fetch("/api/admin/upload-stock-voice", {
        method: "POST",
        body: form,
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        bytes?: number;
        contentType?: string;
        error?: string;
      };
      if (res.ok && data.success === true) {
        setOutcome({
          kind: "success",
          bytes: data.bytes ?? file.size,
          contentType: data.contentType ?? file.type,
        });
        // Re-render the server-signed audio element so the new clip
        // plays inline without a hard reload.
        router.refresh();
      } else {
        setOutcome({
          kind: "error",
          message: data.error ?? `HTTP ${res.status}`,
        });
      }
    } catch (err) {
      setOutcome({
        kind: "error",
        message: (err as Error).message ?? "Network error.",
      });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.m4a,.wav,.ogg"
        onChange={handleChange}
        disabled={outcome.kind === "uploading"}
        className="block text-[12px] text-ink-mid file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-navy file:text-white file:text-[12px] file:font-bold file:hover:bg-navy/90 file:disabled:opacity-50"
      />
      {outcome.kind === "uploading" ? (
        <p className="mt-2 text-[12px] text-ink-mid">Uploading…</p>
      ) : null}
      {outcome.kind === "success" ? (
        <p className="mt-2 text-[12px] text-sage font-semibold">
          Uploaded {(outcome.bytes / 1024).toFixed(1)} KB (
          {outcome.contentType}). Preview refreshed.
        </p>
      ) : null}
      {outcome.kind === "error" ? (
        <p className="mt-2 text-[12px] text-red-700 font-mono break-all">
          {outcome.message}
        </p>
      ) : null}
    </div>
  );
}
