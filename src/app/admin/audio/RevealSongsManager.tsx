"use client";

import {
  AlertCircle,
  Loader2,
  Music,
  Pause,
  Play,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Song = {
  id: string;
  name: string;
  r2Key: string;
  durationSec: number | null;
  uploadedAt: string;
};

/**
 * Admin section for managing reveal background songs.
 *
 * Lists every uploaded song with name + duration + preview play
 * + delete button. Upload form takes a name + audio file; reads
 * duration locally via HTMLAudioElement.metadata so the catalog
 * shows pretty "2:42" badges without us needing ffprobe.
 *
 * Mutations hit /api/admin/reveal-songs[/{id}]; preview audio
 * loads via /api/reveal-songs (which signs URLs).
 */
export function RevealSongsManager() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const previewUrlsRef = useRef<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reveal-songs", { cache: "no-store" });
      if (!res.ok) throw new Error("Couldn't load songs.");
      const body = (await res.json()) as { songs: Song[] };
      setSongs(body.songs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // Snapshot the ref so cleanup revokes the URLs that existed
    // at mount-time instead of chasing a moving target.
    const preview = previewUrlsRef;
    return () => {
      for (const url of Object.values(preview.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      // Try to grab duration locally so the badge is meaningful.
      const durationSec = await readAudioDuration(file).catch(() => null);

      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", name.trim() || file.name);
      if (durationSec) fd.append("durationSec", String(Math.round(durationSec)));

      const res = await fetch("/api/admin/reveal-songs", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Upload failed.");
      }
      setName("");
      setFile(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this song? Vaults using it will revert to no music.")) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/admin/reveal-songs/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't delete.");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function togglePlay(song: Song) {
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Pull a signed preview URL via the user-facing endpoint.
    const res = await fetch("/api/reveal-songs", { cache: "no-store" });
    if (!res.ok) {
      setError("Couldn't load preview URL.");
      return;
    }
    const body = (await res.json()) as {
      songs: { id: string; previewUrl: string | null }[];
    };
    const url = body.songs.find((s) => s.id === song.id)?.previewUrl;
    if (!url) {
      setError("Preview unavailable.");
      return;
    }
    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    void audio.play();
    setPlayingId(song.id);
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={handleUpload}
        className="rounded-xl border border-navy/10 bg-white px-5 py-4 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1.5">
              Song name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Soft strings — short loop"
              maxLength={80}
              className="account-input"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1.5">
              Audio file (MP3 / M4A, ≤ 20 MB)
            </span>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink-mid file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-amber-tint file:text-amber-dark hover:file:bg-amber-tint/80"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!file || uploading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber text-white text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Loader2
                size={14}
                strokeWidth={1.75}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Upload size={14} strokeWidth={1.75} aria-hidden="true" />
            )}
            {uploading ? "Uploading…" : "Upload song"}
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-ink-light">Loading songs…</p>
      ) : songs.length === 0 ? (
        <p className="text-sm text-ink-light italic">
          No songs uploaded yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {songs.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-navy/10 bg-white px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => togglePlay(s)}
                  aria-label={playingId === s.id ? "Pause preview" : "Play preview"}
                  className="shrink-0 w-9 h-9 rounded-full bg-amber-tint text-amber flex items-center justify-center hover:bg-amber hover:text-white transition-colors"
                >
                  {playingId === s.id ? (
                    <Pause size={14} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Play size={14} strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
                <div className="min-w-0">
                  <div className="font-semibold text-navy truncate">{s.name}</div>
                  <div className="text-xs text-ink-light flex items-center gap-2">
                    <Music size={11} strokeWidth={1.75} aria-hidden="true" />
                    {s.durationSec != null
                      ? formatDuration(s.durationSec)
                      : "—"}
                    <span aria-hidden="true">·</span>
                    {new Date(s.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(s.id)}
                aria-label="Delete song"
                className="text-ink-light hover:text-red-600 transition-colors"
              >
                <Trash2 size={16} strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const a = new Audio(url);
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      const d = a.duration;
      URL.revokeObjectURL(url);
      if (Number.isFinite(d) && d > 0) resolve(d);
      else reject(new Error("No duration"));
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Decode failed"));
    };
  });
}
