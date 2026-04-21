"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, ZoomIn, ZoomOut } from "lucide-react";

import { formatLong } from "@/lib/dateFormatters";

type Props = {
  vaultId: string;
  vaultRevealDate: string | null;
  childFirstName: string;
  onClose: () => void;
};

// Matches Vault cover target. Keeps thumbnails on the collection card
// and a potential hero crisp at standard retina viewports.
const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 1200;

/**
 * CreateCollectionModal — popup that lets a vault owner spin up a new
 * Collection in one step: name + cover photo + description + reveal
 * date. The reveal date override is optional and intentionally allowed
 * to be SHORTER than the vault's overall reveal date (a milestone can
 * be opened early inside the surrounding capsule).
 *
 * Pipeline on save:
 *   1. POST /api/collections — creates the Collection row
 *   2. If the user cropped an image: sign + PUT to R2, then PATCH
 *      /api/account/collections/{id}/cover with the object key
 *   3. router.refresh() so the vault landing picks up the new row
 *
 * Cropping happens inline inside the modal via react-easy-crop, same
 * library the vault cover uses.
 */
export function CreateCollectionModal({
  vaultId,
  vaultRevealDate,
  childFirstName,
  onClose,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [revealDate, setRevealDate] = useState("");
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
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Give the collection a name.");
      return;
    }
    if (revealDate && vaultRevealDate) {
      const picked = new Date(revealDate);
      const vaultDate = new Date(vaultRevealDate);
      if (!Number.isNaN(picked.getTime()) && picked > vaultDate) {
        setError(
          `Reveal date can't be after the vault's ${formatLong(vaultRevealDate)}.`,
        );
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      // 1. Create the collection row
      const createRes = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId,
          title: trimmedTitle,
          description: description.trim() || null,
          revealDate: revealDate || null,
        }),
      });
      if (!createRes.ok) {
        const err = (await createRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Couldn't create the collection.");
      }
      const { id: collectionId } = (await createRes.json()) as { id: string };

      // 2. Upload cover if one was cropped
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
            New collection for {childFirstName}
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
            {/* Name */}
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

            {/* Cover */}
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
                      Replace
                    </button>
                  </div>
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
                  <span className="text-[11px] text-ink-light">Optional</span>
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

            {/* About */}
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

            {/* Reveal date */}
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light mb-1">
                Reveal date
                <span className="ml-2 font-normal normal-case tracking-normal text-ink-light/70 italic">
                  optional — can be earlier than the vault, not later
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
              {saving ? "Creating…" : "Create collection"}
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
