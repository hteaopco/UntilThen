"use client";

import {
  Camera,
  Library,
  Mic,
  Pencil,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CreateCollectionModal } from "@/components/dashboard/CreateCollectionModal";

type PickerVariant = "primary" | "secondary";

/**
 * Unified creation CTA. Renders a single button that, when
 * clicked, opens a modal offering every way to start something
 * new — letter, voice note, photo, or collection. Collapses the
 * previous spread of top-level actions (the "+ New" dropdown, the
 * three letter/voice/photo buttons, and the "Start a collection"
 * button) into one discoverable entry point.
 */
export function CreationPicker({
  vaultId,
  vaultRevealDate,
  childFirstName,
  childDateOfBirth,
  label = "Start something new",
  variant = "primary",
}: {
  vaultId: string;
  vaultRevealDate: string | null;
  childFirstName: string;
  childDateOfBirth: string | null;
  label?: string;
  variant?: PickerVariant;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);

  const primaryCls =
    "inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors";
  const secondaryCls =
    "inline-flex items-center gap-2 bg-white border border-navy/15 text-navy px-4 py-2.5 rounded-lg text-sm font-bold hover:border-navy transition-colors";

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className={variant === "primary" ? primaryCls : secondaryCls}
      >
        {variant === "primary" && (
          <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
        )}
        {label} →
      </button>

      {pickerOpen && (
        <PickerModal
          vaultId={vaultId}
          onClose={() => setPickerOpen(false)}
          onOpenCollection={() => {
            setPickerOpen(false);
            setCollectionOpen(true);
          }}
        />
      )}

      {collectionOpen && (
        <CreateCollectionModal
          vaultId={vaultId}
          vaultRevealDate={vaultRevealDate}
          childFirstName={childFirstName}
          childDateOfBirth={childDateOfBirth}
          onClose={() => setCollectionOpen(false)}
        />
      )}
    </>
  );
}

function PickerModal({
  vaultId,
  onClose,
  onOpenCollection,
}: {
  vaultId: string;
  onClose: () => void;
  onOpenCollection: () => void;
}) {
  const firstOptionRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    firstOptionRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const writeHref = `/dashboard/new?vault=${vaultId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Start something new"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[460px]"
      >
        <div className="px-7 py-5 border-b border-navy/[0.08] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px]">
              Start something new
            </h2>
            <p className="mt-1 text-sm text-ink-mid leading-[1.5]">
              Pick how you&rsquo;d like to begin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-mid hover:text-navy transition-colors"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="p-3 space-y-1">
          <OptionLink
            ref={firstOptionRef}
            href={writeHref}
            icon={Pencil}
            label="Letter"
            hint="A written note — no length limit."
            onPick={onClose}
          />
          <OptionLink
            href={writeHref}
            icon={Mic}
            label="Voice note"
            hint="Record your voice from inside the editor."
            onPick={onClose}
          />
          <OptionLink
            href={writeHref}
            icon={Camera}
            label="Photo"
            hint="Attach a photo to a note."
            onPick={onClose}
          />
          <OptionButton
            icon={Library}
            label="Collection"
            hint="Group several memories into one sealed journal."
            onClick={onOpenCollection}
          />
        </div>
      </div>
    </div>
  );
}

function OptionLink({
  href,
  icon: Icon,
  label,
  hint,
  onPick,
  ref,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  hint: string;
  onPick: () => void;
  ref?: React.Ref<HTMLAnchorElement>;
}) {
  return (
    <Link
      ref={ref}
      href={href}
      prefetch={false}
      onClick={onPick}
      className="group flex items-center gap-3 w-full rounded-xl px-3 py-3 hover:bg-amber-tint focus:bg-amber-tint focus:outline-none transition-colors"
    >
      <OptionBadge icon={Icon} />
      <div className="flex-1 min-w-0 text-left">
        <div className="text-[15px] font-bold text-navy">{label}</div>
        <div className="text-xs text-ink-mid">{hint}</div>
      </div>
      <span
        aria-hidden="true"
        className="text-amber opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-lg"
      >
        →
      </span>
    </Link>
  );
}

function OptionButton({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 w-full rounded-xl px-3 py-3 hover:bg-amber-tint focus:bg-amber-tint focus:outline-none transition-colors text-left"
    >
      <OptionBadge icon={Icon} />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-bold text-navy">{label}</div>
        <div className="text-xs text-ink-mid">{hint}</div>
      </div>
      <span
        aria-hidden="true"
        className="text-amber opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-lg"
      >
        →
      </span>
    </button>
  );
}

function OptionBadge({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div
      aria-hidden="true"
      className="shrink-0 w-10 h-10 rounded-xl bg-amber-tint text-amber flex items-center justify-center"
    >
      <Icon size={18} strokeWidth={1.5} />
    </div>
  );
}
