"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ZoomIn, ZoomOut } from "lucide-react";

type CoverTarget = "vault" | "collection" | "capsuleCover";

type Props = {
  /** Which row the cover lives on. Drives the sign-URL body + the
   * PATCH / DELETE endpoint resolver. */
  target?: CoverTarget;
  /** Kept for back-compat with the original vault-only signature. */
  vaultId?: string;
  /** Preferred. Required when `target` is "collection" or
   *  "capsuleCover". */
  targetId?: string;
  /** Used to personalise the dialog heading. The vault flow
   *  passes the child's first name; the gift-capsule flow passes
   *  the recipient display name; collections pass the title. */
  childFirstName: string;
  currentCoverUrl: string | null;
  onClose: () => void;
};

/** Cropper aspect + output dims per target. The vault and
 *  collection covers were originally a 4:3 hero image
 *  (1600×1200). Gift-capsule covers render in a small rounded
 *  square avatar bubble next to the title — a 1:1 crop at
 *  1024×1024 keeps it sharp on retina without bloating the
 *  upload. */
const TARGET_LAYOUT: Record<
  CoverTarget,
  { aspect: number; width: number; height: number }
> = {
  vault: { aspect: 4 / 3, width: 1600, height: 1200 },
  collection: { aspect: 4 / 3, width: 1600, height: 1200 },
  capsuleCover: { aspect: 1, width: 1024, height: 1024 },
};

/** PATCH / DELETE endpoint for each target. Vault + collection
 *  share the /api/account/<plural>/<id>/cover shape; the gift
 *  capsule cover lives under /api/capsules/<id>/cover (built in
 *  the same pattern but on a different namespace). */
function endpointFor(target: CoverTarget, id: string): string {
  if (target === "capsuleCover") return `/api/capsules/${id}/cover`;
  return `/api/account/${target}s/${id}/cover`;
}

/**
 * CoverUploader — Instagram-style crop dialog for a vault cover.
 *
 *   pick a file → pan + zoom in a 4:3 frame → save
 *
 * Pipeline on save:
 *   1. Canvas-crop the loaded file to `cropAreaPixels` bounds
 *   2. Resize to 1600x1200 and encode JPEG q=0.9
 *   3. POST /api/upload/sign for a signed PUT URL
 *   4. PUT blob to R2 directly
 *   5. PATCH /api/account/vaults/{id}/cover with the object key
 *   6. router.refresh() and close
 */
export function CoverUploader({
  target = "vault",
  vaultId,
  targetId,
  childFirstName,
  currentCoverUrl,
  onClose,
}: Props) {
  const router = useRouter();
  const resolvedTargetId = targetId ?? vaultId ?? "";
  const patchUrl = endpointFor(target, resolvedTargetId);
  const layout = TARGET_LAYOUT[target];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("cover.jpg");
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
    setFilename(file.name || "cover.jpg");
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const fakeEvent = {
      target: { files: [file] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onFilePicked(fakeEvent);
  };

  const onSave = async () => {
    if (!imageSrc || !cropAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await cropToBlob(
        imageSrc,
        cropAreaPixels,
        layout.width,
        layout.height,
      );
      if (!blob) throw new Error("Could not crop image.");
      if (blob.size > 10 * 1024 * 1024) {
        throw new Error("Cropped image is still larger than 10MB.");
      }

      const safeName = `${filename.replace(/\.[^/.]+$/, "") || "cover"}.jpg`;
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          targetId: resolvedTargetId,
          kind: "photo",
          contentType: "image/jpeg",
          filename: safeName,
          size: blob.size,
        }),
      });
      if (!signRes.ok) {
        const err = (await signRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Couldn't prepare upload.");
      }
      const { uploadUrl, key } = (await signRes.json()) as {
        uploadUrl: string;
        key: string;
      };

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed.");

      const patchRes = await fetch(
        patchUrl,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }),
        },
      );
      if (!patchRes.ok) {
        const err = (await patchRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Couldn't save cover.");
      }

      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const onRemove = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(patchUrl, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Couldn't remove cover.");
      }
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-[560px] max-h-[92vh] flex flex-col bg-cream rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-navy/5">
          <h2 className="text-[17px] font-bold text-navy tracking-[-0.2px]">
            {childFirstName}&rsquo;s cover photo
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

        <div className="flex-1 overflow-y-auto">
          {!imageSrc ? (
            <Picker
              fileInputRef={fileInputRef}
              onFilePicked={onFilePicked}
              onDrop={onDrop}
              currentCoverUrl={currentCoverUrl}
              aspect={layout.aspect}
            />
          ) : (
            <div className="flex flex-col">
              <div
                className="relative w-full bg-black"
                style={{ aspectRatio: `${layout.aspect}` }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={layout.aspect}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid={true}
                  objectFit="contain"
                  zoomSpeed={0.25}
                  minZoom={1}
                  maxZoom={4}
                  cropShape="rect"
                />
              </div>

              <div className="px-5 py-4 border-t border-navy/5 flex items-center gap-3">
                <ZoomOut size={16} strokeWidth={1.75} className="text-ink-light" aria-hidden="true" />
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
                <ZoomIn size={16} strokeWidth={1.75} className="text-ink-light" aria-hidden="true" />
              </div>
            </div>
          )}

          {error && (
            <div className="mx-5 mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
              {error}
            </div>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-navy/5 flex items-center gap-2 justify-between">
          {imageSrc ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setImageSrc(null);
                  setCropAreaPixels(null);
                }}
                disabled={saving}
                className="text-[13px] font-semibold text-ink-mid hover:text-navy transition-colors disabled:opacity-40"
              >
                Pick different
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-navy/10 text-[13px] font-semibold text-ink-mid hover:text-navy hover:border-navy/20 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving || !cropAreaPixels}
                  className="px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save cover"}
                </button>
              </div>
            </>
          ) : (
            <>
              {currentCoverUrl ? (
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={saving}
                  className="text-[13px] font-semibold text-red-700 hover:text-red-800 transition-colors disabled:opacity-40"
                >
                  Remove cover
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors"
              >
                Choose photo
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
}

function Picker({
  fileInputRef,
  onFilePicked,
  onDrop,
  currentCoverUrl,
  aspect,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilePicked: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  currentCoverUrl: string | null;
  aspect: number;
}) {
  // Friendly "Shown at X:Y" text mapped from the aspect ratio so
  // the picker hint matches the cropper frame the user is about
  // to see. 1:1 is the gift-capsule avatar; 4:3 is the vault /
  // collection hero. Anything else falls back to a generic line.
  const aspectHint =
    aspect === 1 ? "1:1" : aspect === 4 / 3 ? "4:3" : null;
  return (
    <div className="p-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-2xl border-2 border-dashed border-amber/40 bg-white/60 py-12 px-6 flex flex-col items-center gap-3 text-center"
      >
        <p className="text-[14px] text-navy font-semibold">
          Drop a photo here or choose from your device
        </p>
        <p className="text-[12px] text-ink-light">
          {aspectHint ? `Shown at ${aspectHint}` : "You'll see a live crop"} —
          you&rsquo;ll be able to pan and zoom before saving.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2 px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors"
        >
          Choose photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFilePicked}
        />
        {currentCoverUrl && (
          <div className="mt-4 w-full">
            <p className="text-[12px] text-ink-light mb-2">Current cover</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentCoverUrl}
              alt=""
              style={{ aspectRatio: `${aspect}` }}
              className="w-full object-cover rounded-xl border border-amber/20"
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Crops the source image to the given pixel rectangle, downscales
 * to outputW × outputH, and returns a JPEG blob. Returns null if
 * the canvas cannot produce a blob (shouldn't happen in any
 * supported browser). Output dims vary per target — the vault /
 * collection hero is 1600×1200; the gift-capsule avatar is
 * 1024×1024.
 */
async function cropToBlob(
  imageSrc: string,
  area: Area,
  outputW: number,
  outputH: number,
): Promise<Blob | null> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = outputW;
  canvas.height = outputH;
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
    outputW,
    outputH,
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
