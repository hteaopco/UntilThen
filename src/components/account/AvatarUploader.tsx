"use client";

import Cropper, { type Area } from "react-easy-crop";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ZoomIn, ZoomOut } from "lucide-react";

type Props = {
  /** The viewer's own User.id — used to key the R2 upload. */
  userId: string;
  /** Signed GET URL for the existing avatar, or null. Used to show
   *  the current photo inside the picker and enable "Remove". */
  currentAvatarUrl: string | null;
  onClose: () => void;
};

// 512×512 is ample for an avatar — the biggest surface shows it at
// ~80px logical / 160px retina, so 512 gives headroom for sharpness
// without wasting bytes. JPEG q=0.9 keeps file size under ~60KB.
const OUTPUT_SIZE = 512;

/**
 * AvatarUploader — circular crop dialog for a user's headshot.
 *
 *   pick a file → pan + zoom in a round 1:1 frame → save
 *
 * Pipeline on save:
 *   1. Canvas-crop the loaded file to `cropAreaPixels`
 *   2. Resize to 512×512 and encode JPEG q=0.9
 *   3. POST /api/upload/sign (target=userAvatar, targetId=userId)
 *   4. PUT blob to R2 directly
 *   5. PATCH /api/account/avatar with the object key
 *   6. router.refresh() and close
 */
export function AvatarUploader({ userId, currentAvatarUrl, onClose }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("avatar.jpg");
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
    setFilename(file.name || "avatar.jpg");
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
      const blob = await cropToBlob(imageSrc, cropAreaPixels);
      if (!blob) throw new Error("Could not crop image.");

      const safeName = `${filename.replace(/\.[^/.]+$/, "") || "avatar"}.jpg`;
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "userAvatar",
          targetId: userId,
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

      const patchRes = await fetch("/api/account/avatar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      if (!patchRes.ok) {
        const err = (await patchRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(err.error ?? "Couldn't save avatar.");
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
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Couldn't remove avatar.");
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
      <div className="w-full max-w-[480px] max-h-[92vh] flex flex-col bg-cream rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-navy/5">
          <h2 className="text-[17px] font-bold text-navy tracking-[-0.2px]">
            Profile photo
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
              currentAvatarUrl={currentAvatarUrl}
            />
          ) : (
            <div className="flex flex-col">
              <div className="relative w-full aspect-square bg-black">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid={false}
                  objectFit="contain"
                  zoomSpeed={0.25}
                  minZoom={1}
                  maxZoom={4}
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
                  {saving ? "Saving…" : "Save photo"}
                </button>
              </div>
            </>
          ) : (
            <>
              {currentAvatarUrl ? (
                <button
                  type="button"
                  onClick={onRemove}
                  disabled={saving}
                  className="text-[13px] font-semibold text-red-700 hover:text-red-800 transition-colors disabled:opacity-40"
                >
                  Remove photo
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
  currentAvatarUrl,
}: {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFilePicked: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  currentAvatarUrl: string | null;
}) {
  return (
    <div className="p-5">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="rounded-2xl border-2 border-dashed border-amber/40 bg-white/60 py-10 px-6 flex flex-col items-center gap-3 text-center"
      >
        {currentAvatarUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={currentAvatarUrl}
            alt=""
            className="w-28 h-28 rounded-full object-cover border border-amber/20"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-amber-tint flex items-center justify-center text-amber text-[12px] font-semibold tracking-[0.14em] uppercase">
            No photo
          </div>
        )}
        <p className="text-[14px] text-navy font-semibold mt-2">
          Drop a photo here or choose from your device
        </p>
        <p className="text-[12px] text-ink-light">
          Square crop — you&rsquo;ll be able to pan and zoom before saving.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-1 px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors"
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
      </div>
    </div>
  );
}

async function cropToBlob(imageSrc: string, area: Area): Promise<Blob | null> {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
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
    OUTPUT_SIZE,
    OUTPUT_SIZE,
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
