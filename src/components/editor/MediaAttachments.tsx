"use client";

import { Camera, FileAudio, Mic, Video, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type Attachment = {
  key: string;
  kind: "photo" | "voice" | "video";
  viewUrl: string; // presigned GET from /api/upload/complete
  name: string;
};

const LIMITS = {
  photo: { maxBytes: 10 * 1024 * 1024, hint: "Up to 10MB · JPG, PNG, HEIC" },
  voice: {
    maxBytes: 50 * 1024 * 1024,
    hint: "Record or upload · up to 5 minutes",
  },
  video: { maxBytes: 200 * 1024 * 1024, hint: "Up to 60 seconds · MP4, MOV" },
} as const;

async function uploadFileToR2(
  entryId: string,
  kind: Attachment["kind"],
  file: File,
): Promise<Attachment> {
  // 1. Ask our server for a presigned PUT URL.
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entryId,
      kind,
      contentType: file.type || "application/octet-stream",
      filename: file.name,
      size: file.size,
    }),
  });
  if (!signRes.ok) {
    const data = (await signRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Couldn't start upload.");
  }
  const { uploadUrl, key } = (await signRes.json()) as {
    uploadUrl: string;
    key: string;
  };

  // 2. PUT the file directly to R2.
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status}).`);
  }

  // 3. Tell our server the upload landed so it can record + give us a view URL.
  const completeRes = await fetch("/api/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entryId, key, kind }),
  });
  if (!completeRes.ok) {
    const data = (await completeRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Couldn't save the upload.");
  }
  const { viewUrl } = (await completeRes.json()) as { viewUrl: string };

  return { key, kind, viewUrl, name: file.name };
}

function checkVideoDuration(file: File, maxSeconds: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      if (v.duration > maxSeconds) {
        reject(
          new Error(
            `Video is ${Math.round(v.duration)}s long. Max is ${maxSeconds}s.`,
          ),
        );
      } else {
        resolve(v.duration);
      }
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read video duration."));
    };
    v.src = url;
  });
}

export function MediaAttachments({
  entryId,
  initial,
  ensureEntry,
}: {
  entryId: string | null;
  initial: Attachment[];
  ensureEntry: () => Promise<string | null>;
}) {
  const [attachments, setAttachments] = useState<Attachment[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recorderOpen, setRecorderOpen] = useState(false);

  async function handleFiles(kind: Attachment["kind"], files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    // Make sure there's an entry to attach to.
    const id = entryId ?? (await ensureEntry());
    if (!id) {
      setError("Write something first, then add media.");
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > LIMITS[kind].maxBytes) {
          throw new Error(
            `"${file.name}" is larger than ${LIMITS[kind].maxBytes / 1024 / 1024}MB.`,
          );
        }
        if (kind === "video") {
          await checkVideoDuration(file, 60);
        }
        const att = await uploadFileToR2(id, kind, file);
        setAttachments((prev) => [...prev, att]);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRecordedBlob(blob: Blob, durationSec: number) {
    setRecorderOpen(false);
    setError(null);
    const id = entryId ?? (await ensureEntry());
    if (!id) {
      setError("Write something first, then add media.");
      return;
    }
    const ext = blob.type.includes("mp4")
      ? "m4a"
      : blob.type.includes("webm")
        ? "webm"
        : "ogg";
    const file = new File([blob], `voice-${Date.now()}.${ext}`, {
      type: blob.type,
    });
    setUploading(true);
    try {
      if (file.size > LIMITS.voice.maxBytes) {
        throw new Error(`Recording too large.`);
      }
      const att = await uploadFileToR2(id, "voice", file);
      att.name = `Voice memo · ${formatDuration(durationSec)}`;
      setAttachments((prev) => [...prev, att]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function removeAttachment(att: Attachment, idx: number) {
    if (!entryId) return;
    if (
      !window.confirm(`Remove "${att.name}"? This can't be undone.`)
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/entries/${entryId}/media/${idx}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't delete.");
      }
      setAttachments((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div>
      <label className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-3">
        Attachments{attachments.length > 0 && ` · ${attachments.length}`}
      </label>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <FilePickerButton
          icon={<Camera size={16} strokeWidth={1.5} aria-hidden="true" />}
          label="Add photo"
          accept="image/*"
          multiple
          onChange={(files) => handleFiles("photo", files)}
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => setRecorderOpen(true)}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-navy/15 text-sm font-semibold text-navy bg-white hover:border-navy transition-colors disabled:opacity-50"
        >
          <Mic size={16} strokeWidth={1.5} aria-hidden="true" />
          Record voice
        </button>
        <FilePickerButton
          icon={<FileAudio size={16} strokeWidth={1.5} aria-hidden="true" />}
          label="Voice file"
          accept="audio/*"
          onChange={(files) => handleFiles("voice", files)}
          disabled={uploading}
        />
        <FilePickerButton
          icon={<Video size={16} strokeWidth={1.5} aria-hidden="true" />}
          label="Add video"
          accept="video/*"
          onChange={(files) => handleFiles("video", files)}
          disabled={uploading}
        />
      </div>
      <p className="text-xs italic text-ink-light mb-4">
        Photos up to 10MB · Voice up to 5 min · Video up to 60s
      </p>

      {uploading && (
        <p className="text-sm text-ink-mid italic mb-3">Uploading…</p>
      )}
      {error && (
        <p className="text-sm text-red-600 mb-3" role="alert">
          {error}
        </p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((att, i) => (
            <li
              key={`${att.key}-${i}`}
              className="rounded-xl border border-navy/[0.08] bg-white p-3 flex items-center gap-3"
            >
              <AttachmentThumb att={att} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-amber">
                  {att.kind}
                </div>
                <div className="text-sm text-navy truncate">{att.name}</div>
              </div>
              <button
                type="button"
                onClick={() => removeAttachment(att, i)}
                aria-label={`Remove ${att.name}`}
                className="text-ink-light hover:text-red-600 px-2"
              >
                <X size={18} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {recorderOpen && (
        <VoiceRecorder
          onDone={handleRecordedBlob}
          onCancel={() => setRecorderOpen(false)}
        />
      )}
    </div>
  );
}

function AttachmentThumb({ att }: { att: Attachment }) {
  if (att.kind === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={att.viewUrl}
        alt=""
        className="w-12 h-12 rounded-lg object-cover border border-navy/[0.06]"
      />
    );
  }
  if (att.kind === "video") {
    return (
      <video
        src={att.viewUrl}
        className="w-12 h-12 rounded-lg object-cover bg-navy/10"
        muted
        playsInline
      />
    );
  }
  return (
    <div className="w-12 h-12 rounded-lg bg-amber-tint flex items-center justify-center text-amber">
      <Mic size={20} strokeWidth={1.5} aria-hidden="true" />
    </div>
  );
}

function FilePickerButton({
  icon,
  label,
  accept,
  multiple,
  onChange,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  accept: string;
  multiple?: boolean;
  onChange: (files: FileList | null) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-navy/15 text-sm font-semibold text-navy bg-white hover:border-navy transition-colors disabled:opacity-50"
      >
        {icon}
        {label}
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          onChange(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── VoiceRecorder ──────────────────────────────────────────────

function VoiceRecorder({
  onDone,
  onCancel,
}: {
  onDone: (blob: Blob, durationSec: number) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "stopped">("idle");
  const [duration, setDuration] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const tickRef = useRef<number | null>(null);
  const startAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function pickMimeType(): string {
    const candidates = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return "";
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMimeType();
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, {
          type: mime || "audio/webm",
        });
        setBlob(b);
        setPreviewUrl(URL.createObjectURL(b));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (tickRef.current) window.clearInterval(tickRef.current);
        setState("stopped");
      };
      recorder.start();
      recorderRef.current = recorder;
      startAtRef.current = Date.now();
      setDuration(0);
      tickRef.current = window.setInterval(() => {
        const d = (Date.now() - startAtRef.current) / 1000;
        setDuration(d);
        // Auto-stop at 5 minutes to match the 5-minute voice limit.
        if (d >= 300 && recorder.state === "recording") recorder.stop();
      }, 250);
      setState("recording");
    } catch (err) {
      setError(
        (err as Error).message ||
          "Couldn't access the microphone. Check browser permissions.",
      );
    }
  }

  function stop() {
    recorderRef.current?.stop();
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setDuration(0);
    setState("idle");
  }

  function attach() {
    if (blob) onDone(blob, duration);
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-navy/40 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[420px] p-7"
      >
        <h3 className="text-xl font-bold text-navy mb-1">Record a voice memo</h3>
        <p className="text-sm text-ink-mid mb-6">
          Up to 5 minutes. Your mic indicator will turn on while recording.
        </p>

        <div className="rounded-xl bg-warm-surface px-5 py-8 text-center mb-5">
          <div className="text-4xl font-extrabold text-navy tabular-nums tracking-[-0.5px]">
            {formatDuration(duration)}
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.12em] font-bold text-ink-light">
            {state === "recording"
              ? "Recording"
              : state === "stopped"
                ? "Recorded"
                : "Ready"}
          </div>
          {state === "stopped" && previewUrl && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio controls src={previewUrl} className="mt-5 w-full" />
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2"
          >
            Cancel
          </button>
          {state === "idle" && (
            <button
              type="button"
              onClick={start}
              className="bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              Start recording
            </button>
          )}
          {state === "recording" && (
            <button
              type="button"
              onClick={stop}
              className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          )}
          {state === "stopped" && (
            <>
              <button
                type="button"
                onClick={reset}
                className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2"
              >
                Re-record
              </button>
              <button
                type="button"
                onClick={attach}
                className="bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
              >
                Attach
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
