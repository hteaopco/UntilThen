"use client";

import { Camera, Mic, MicOff, Upload, Video, X } from "lucide-react";
import { useRef, useState } from "react";

type Attachment = {
  key: string;
  kind: string;
  name: string;
  previewUrl?: string;
};

export function PublicMediaAttachments({
  token,
  ensureContribution,
  onChange,
  uploadEndpoint,
}: {
  token: string;
  ensureContribution: () => Promise<string | null>;
  onChange: (keys: string[], types: string[]) => void;
  /** Override the upload endpoint base. Defaults to the
   *  invite-token contribute path; the wedding-guest flow
   *  passes "/api/wedding/contribute" so uploads route to the
   *  guest-token endpoint instead. The full URL becomes
   *  `${uploadEndpoint}/${token}/upload`. */
  uploadEndpoint?: string;
}) {
  const endpointBase = uploadEndpoint ?? "/api/contribute/capsule";
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingKind, setPendingKind] = useState<"photo" | "voice" | "video">("photo");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function handleFile(file: File, kind: "photo" | "voice" | "video") {
    setError(null);
    setUploading(true);
    try {
      const contributionId = await ensureContribution();
      if (!contributionId) {
        setError("Enter your name first.");
        setUploading(false);
        return;
      }

      const signRes = await fetch(`${endpointBase}/${token}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sign",
          contributionId,
          kind,
          contentType: file.type,
          filename: file.name,
          size: file.size,
        }),
      });
      if (!signRes.ok) {
        const data = (await signRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Upload failed.");
      }
      const { uploadUrl, key } = (await signRes.json()) as { uploadUrl: string; key: string };

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const previewUrl = kind === "photo" ? URL.createObjectURL(file) : undefined;
      const next = [...attachments, { key, kind, name: file.name, previewUrl }];
      setAttachments(next);
      onChange(next.map((a) => a.key), next.map((a) => a.kind));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      const ext = mime.includes("mp4") ? "m4a" : "webm";
      const finalMime = recorder.mimeType || "audio/webm";
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: finalMime });
        handleFile(file, "voice");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      const msg = (err as Error).name === "NotAllowedError"
        ? "Microphone access denied. Check your browser permissions."
        : "Could not start recording. Try uploading a voice file instead.";
      setError(msg);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function removeAttachment(index: number) {
    const next = attachments.filter((_, i) => i !== index);
    setAttachments(next);
    onChange(next.map((a) => a.key), next.map((a) => a.kind));
  }

  function triggerFile(kind: "photo" | "voice" | "video") {
    setPendingKind(kind);
    if (fileRef.current) {
      fileRef.current.accept =
        kind === "photo" ? "image/*" : kind === "voice" ? "audio/*" : "video/*";
      fileRef.current.click();
    }
  }

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        <button type="button" onClick={() => triggerFile("photo")} disabled={uploading || recording}
          className="inline-flex items-center gap-1 flex-1 justify-center px-2 py-1.5 rounded-full border border-navy/15 text-[11px] font-semibold text-ink-mid hover:border-amber/40 hover:text-amber transition-colors disabled:opacity-40">
          <Camera size={13} strokeWidth={1.5} /> Photo
        </button>
        <button type="button" onClick={() => triggerFile("video")} disabled={uploading || recording}
          className="inline-flex items-center gap-1 flex-1 justify-center px-2 py-1.5 rounded-full border border-navy/15 text-[11px] font-semibold text-ink-mid hover:border-amber/40 hover:text-amber transition-colors disabled:opacity-40">
          <Video size={13} strokeWidth={1.5} /> Video
        </button>
        <button type="button" onClick={() => triggerFile("voice")} disabled={uploading || recording}
          className="inline-flex items-center gap-1 flex-1 justify-center px-2 py-1.5 rounded-full border border-navy/15 text-[11px] font-semibold text-ink-mid hover:border-amber/40 hover:text-amber transition-colors disabled:opacity-40">
          <Upload size={13} strokeWidth={1.5} /> Upload
        </button>
        {recording ? (
          <button type="button" onClick={stopRecording}
            className="inline-flex items-center gap-1 flex-1 justify-center px-2 py-1.5 rounded-full border border-red-400 text-[11px] font-semibold text-red-600 animate-pulse">
            <MicOff size={13} strokeWidth={1.5} /> Stop
          </button>
        ) : (
          <button type="button" onClick={startRecording} disabled={uploading}
            className="inline-flex items-center gap-1 flex-1 justify-center px-2 py-1.5 rounded-full border border-navy/15 text-[11px] font-semibold text-ink-mid hover:border-amber/40 hover:text-amber transition-colors disabled:opacity-40">
            <Mic size={13} strokeWidth={1.5} /> Record
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file, pendingKind);
          e.target.value = "";
        }}
      />

      {uploading && <p className="text-xs text-amber font-semibold mb-2">Uploading...</p>}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={a.key} className="relative group rounded-lg border border-navy/10 bg-white overflow-hidden">
              {a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt="" className="w-16 h-16 object-cover" />
              ) : (
                <div className="w-16 h-16 flex items-center justify-center text-xs text-ink-light">
                  {a.kind === "voice" ? <Mic size={20} /> : <Video size={20} />}
                </div>
              )}
              <button type="button" onClick={() => removeAttachment(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-navy/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
