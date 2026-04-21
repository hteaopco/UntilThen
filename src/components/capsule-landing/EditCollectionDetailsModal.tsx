"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, ZoomIn, ZoomOut } from "lucide-react";

import { formatLong } from "@/lib/dateFormatters";

type Props = {
  collectionId: string;
  /** Reveal date of the parent vault (ISO string or null). Used to
   * clamp the max picker value — a collection can open earlier but
   * not later than the surrounding Time Capsule. */
  vaultRevealDate: string | null;
  initial: {
    title: string;
    description: string | null;
    revealDate: string | null;
    coverUrl: string | null;
  };
  onClose: () => void;
};

// Matches CreateCollectionModal + vault cover output.
const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 1200;

/**
 * Edit-mode companion to CreateCollectionModal. Lets the viewer
 * update a collection's name, cover photo, description, and reveal
 * date in one place.
 *
 * On save:
 *   1. PATCH /api/collections/{id} with title + description + reveal
 *   2. If a new cover crop was produced, sign + PUT to R2, then
 *      PATCH /api/account/collections/{id}/cover with the key
 *   3. router.refresh() so the landing view re-renders
 */
export function EditCollectionDetailsModal({
  collectionId,
  vaultRevealDate,
  initial,
  onClose,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [revealDate, setRevealDate] = useState(
    initial.revealDate ? initial.revealDate.slice(0, 10) : "",
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropAreaPixels, setCropAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCropAreaPixels(areaPixels);
  }, []);

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please pick an image file.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Image is larger than 15MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageSrc(reader.result);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
      }
    };
    reader.readAsDataURL(file);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the collection a name.");
      return;
    }
    if (revealDate && vaultRevealDate) {
      const picked = new Date(revealDate);
      const vault = new Date(vaultRevealDate);
      if (!Number.isNaN(picked.getTime()) && picked > vault) {
        setError(
          `Reveal date can't be after the vault's ${formatLong(vaultRevealDate)}.`,
        );
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      // 1. PATCH the collection metadata
      const patchRes = await fetch(`/api/collections/${collectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
          revealDate: revealDate || null,
        }),
      });
      if (!patchRes.ok) {
        const err = (await patchRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Couldn't save changes.");
      }

      // 2. If a new cover was cropped, upload it + PATCH coverUrl
      if (imageSrc && cropAreaPixels) {
        const blob = await cropToBlob(imageSrc, cropAreaPixels);
        if (blob) {
          const signRes = await fetch("/api/upload/sign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              target: "collection",
              targetId: collectionId,
              kind: "photo",
              contentType: "image/jpeg",
              filename: "cover.jpg",
              size: blob.size,
            }),
          });
          if (signRes.ok) {
            const { uploadUrl, key } = (await signRes.json()) as {
              uploadUrl: string;
              key: string;
            };
            const putRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": "image/jpeg" },
              body: blob,
            });
            if (putRes.ok) {
              await fetch(`/api/account/collections/${collectionId}/cover`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key }),
              });
            }
          }
        }
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-[560px] max-h-[94vh] flex flex-col bg-cream rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-navy/5">
          <h2 className="text-[17px] font-bold text-navy tracking-[-0.2px]">
            Edit collection details
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-mid hover:text-navy hover:bg-white transition-colors disabled:opacity-40"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light mb-1">
                Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Birthday Celebrations"
                maxLength={80}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/50 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light mb-1">
                Cover photo
              </label>
              {imageSrc ? (
                <div className="space-y-2">
                  <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden border border-amber/30">
                    <Cropper
                      image={imageSrc}
                      crop={crop}
                      zoom={zoom}
                      aspect={4 / 3}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                      showGrid={true}
                      objectFit="contain"
                      zoomSpeed={0.25}
                      minZoom={1}
                      maxZoom={4}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <ZoomOut size={14} strokeWidth={1.75} className="text-ink-light" />
                    <input
                      type="range"
                      min={1}
                      max={4}
                      step={0.01}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      disabled={saving}
                      aria-label="Zoom"
                      className="flex-1 accent-amber"
                    />
                    <ZoomIn size={14} strokeWidth={1.75} className="text-ink-light" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageSrc(null);
                        setCropAreaPixels(null);
                      }}
                      disabled={saving}
                      className="text-[11px] font-semibold text-ink-mid hover:text-navy transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : initial.coverUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={initial.coverUrl}
                    alt=""
                    className="shrink-0 w-[120px] aspect-[4/3] object-cover rounded-xl border border-amber/20"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber/40 bg-amber-tint text-amber px-3 py-2 text-[13px] font-semibold hover:bg-amber hover:text-white transition-colors"
                  >
                    <ImagePlus size={14} strokeWidth={1.75} />
                    Replace photo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  className="w-full aspect-[4/3] rounded-xl border-2 border-dashed border-amber/40 bg-white/60 flex flex-col items-center justify-center gap-2 text-amber hover:bg-white hover:border-amber/60 transition-colors"
                >
                  <span className="w-12 h-12 rounded-full bg-amber-tint flex items-center justify-center">
                    <ImagePlus size={22} strokeWidth={1.75} />
                  </span>
                  <span className="text-[13px] font-semibold">Add cover photo</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFilePicked}
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light mb-1">
                What is this collection about?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Every birthday we've celebrated together…"
                rows={3}
                maxLength={400}
                className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/50 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light mb-1">
                Reveal date
                <span className="ml-2 font-normal normal-case tracking-normal text-ink-light/70 italic">
                  can be earlier than the vault, not later
                </span>
              </label>
              <input
                type="date"
                value={revealDate}
                onChange={(e) => setRevealDate(e.target.value)}
                max={vaultRevealDate ? vaultRevealDate.slice(0, 10) : undefined}
                className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
              />
              {vaultRevealDate && (
                <p className="mt-1 text-[11px] text-ink-light italic">
                  Vault opens on {formatLong(vaultRevealDate)}.
                </p>
              )}
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
                {error}
              </div>
            )}
          </div>

          <footer className="px-5 py-4 border-t border-navy/5 flex items-center justify-end gap-2 bg-cream">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-navy/10 text-[13px] font-semibold text-ink-mid hover:text-navy hover:border-navy/20 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

async function cropToBlob(imageSrc: string, area: Area): Promise<Blob | null> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
  );
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}
