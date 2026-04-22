"use client";

import { AlertCircle, ArrowLeft, Check, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AddChildModal } from "@/components/account/AddChildModal";

type SaveState = "idle" | "saving" | "saved" | "error";

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.split("T")[0] ?? "";
}

function formatDate(iso: string): string {
  if (!iso) return "Not set";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ChildEditForm({
  childId,
  firstName: initialFirstName,
  dateOfBirth: initialDob,
  revealDate: initialReveal,
  parentDisplayName: initialParentDisplayName,
  trusteeName: initialTrusteeName,
  trusteeEmail: initialTrusteeEmail,
  trusteePhone: initialTrusteePhone,
}: {
  childId: string;
  firstName: string;
  dateOfBirth: string | null;
  revealDate: string | null;
  parentDisplayName: string;
  trusteeName: string;
  trusteeEmail: string;
  trusteePhone: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);

  const [parentDisplayName, setParentDisplayName] = useState(
    initialParentDisplayName,
  );
  const [parentDisplayState, setParentDisplayState] =
    useState<SaveState>("idle");
  const [parentDisplayError, setParentDisplayError] = useState<string | null>(
    null,
  );

  // Trustee fields stay editable inline (not in the modal).
  const [trusteeName, setTrusteeName] = useState(initialTrusteeName);
  const [trusteeEmail, setTrusteeEmail] = useState(initialTrusteeEmail);
  const [trusteePhone, setTrusteePhone] = useState(initialTrusteePhone);
  const [trusteeState, setTrusteeState] = useState<SaveState>("idle");
  const [trusteeError, setTrusteeError] = useState<string | null>(null);

  const dobDisplay = initialDob ? formatDate(toDateInput(initialDob)) : "Not set";
  const revealDisplay = initialReveal ? formatDate(toDateInput(initialReveal)) : "Not set";

  async function patchChild(body: Record<string, unknown>) {
    const res = await fetch(`/api/account/children/${childId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? "Couldn't save.");
    }
  }

  async function saveParentDisplay(e: FormEvent) {
    e.preventDefault();
    setParentDisplayState("saving");
    setParentDisplayError(null);
    try {
      await patchChild({
        firstName: initialFirstName,
        dateOfBirth: initialDob ? toDateInput(initialDob) : null,
        revealDate: initialReveal ? toDateInput(initialReveal) : null,
        parentDisplayName: parentDisplayName.trim() || null,
      });
      setParentDisplayState("saved");
      router.refresh();
      setTimeout(() => setParentDisplayState("idle"), 2200);
    } catch (err) {
      setParentDisplayError((err as Error).message);
      setParentDisplayState("error");
    }
  }

  async function saveTrustee(e: FormEvent) {
    e.preventDefault();
    setTrusteeState("saving");
    setTrusteeError(null);
    try {
      await patchChild({
        firstName: initialFirstName,
        dateOfBirth: initialDob ? toDateInput(initialDob) : null,
        revealDate: initialReveal ? toDateInput(initialReveal) : null,
        trusteeName: trusteeName.trim() || null,
        trusteeEmail: trusteeEmail.trim() || null,
        trusteePhone: trusteePhone.trim() || null,
      });
      setTrusteeState("saved");
      router.refresh();
      setTimeout(() => setTrusteeState("idle"), 2200);
    } catch (err) {
      setTrusteeError((err as Error).message);
      setTrusteeState("error");
    }
  }

  return (
    <div className="space-y-10">
      <Link href="/account/capsules" prefetch={false}
        className="inline-flex items-center gap-2 text-sm text-ink-mid hover:text-navy transition-colors">
        <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
        All capsules
      </Link>

      {/* ── Capsule Information (read-only + edit button) ──── */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
              Time Capsule Details
            </p>
            <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px]">
              Capsule Information
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-navy/15 text-sm font-semibold text-navy hover:border-amber hover:text-amber transition-colors"
          >
            <Pencil size={14} strokeWidth={1.75} aria-hidden="true" />
            Edit Information
          </button>
        </div>

        <div className="space-y-4">
          <ReadOnlyField label="Name" value={initialFirstName} />
          <ReadOnlyField label="Date of birth" value={dobDisplay} />
          <ReadOnlyField label="Reveal date" value={revealDisplay} />
        </div>
      </section>

      <hr className="border-navy/[0.06]" />

      {/* ── What they call you ──────────────────────────────── */}
      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-2">
          What they call you
        </p>
        <p className="text-sm text-ink-mid mb-5 max-w-[560px]">
          Personalises the &ldquo;from&rdquo; line on this capsule&rsquo;s
          reveal. Use whatever {initialFirstName} actually calls you &mdash;
          &ldquo;Dad,&rdquo; &ldquo;Mom,&rdquo; &ldquo;Mama,&rdquo; or your
          first name. Leave blank to fall back to your account display name.
        </p>

        <form onSubmit={saveParentDisplay} className="space-y-4">
          <div className="max-w-[320px]">
            <Field label={`Name shown to ${initialFirstName}`}>
              <input
                type="text"
                value={parentDisplayName}
                onChange={(e) => setParentDisplayName(e.target.value)}
                placeholder="Dad"
                className="account-input"
                maxLength={40}
              />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={parentDisplayState === "saving"}
              className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {parentDisplayState === "saving" ? "Saving…" : "Save"}
            </button>
            {parentDisplayState === "saved" && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage">
                <Check size={16} strokeWidth={2} aria-hidden="true" /> Saved
              </span>
            )}
            {parentDisplayState === "error" && parentDisplayError && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />{" "}
                {parentDisplayError}
              </span>
            )}
          </div>
        </form>
      </section>

      <hr className="border-navy/[0.06]" />

      {/* ── Trustee / Legacy contact ────────────────────────── */}
      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-2">
          Trustee / Legacy contact
        </p>
        <p className="text-sm text-ink-mid mb-5">
          The person who can request capsule transfer if you&rsquo;re unable
          to access your account. We only contact them after 12+ months of
          inactivity.
        </p>

        <form onSubmit={saveTrustee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input type="text" value={trusteeName} onChange={(e) => setTrusteeName(e.target.value)}
                placeholder="Spouse, sibling, close friend, etc" className="account-input" />
            </Field>
            <Field label="Email">
              <input type="email" value={trusteeEmail} onChange={(e) => setTrusteeEmail(e.target.value)}
                placeholder="trustee@email.com" className="account-input" />
            </Field>
            <Field label="Phone">
              <input type="tel" value={trusteePhone} onChange={(e) => setTrusteePhone(e.target.value)}
                placeholder="+1 555 123 4567" className="account-input" />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={trusteeState === "saving"}
              className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60">
              {trusteeState === "saving" ? "Saving\u2026" : "Save changes"}
            </button>
            {trusteeState === "saved" && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage">
                <Check size={16} strokeWidth={2} aria-hidden="true" /> Saved
              </span>
            )}
            {trusteeState === "error" && trusteeError && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" /> {trusteeError}
              </span>
            )}
          </div>
        </form>
      </section>

      {/* Edit modal — reuses AddChildModal in edit mode */}
      {editOpen && (
        <AddChildModal
          onClose={() => {
            setEditOpen(false);
            router.refresh();
          }}
          editMode={{
            childId,
            firstName: initialFirstName,
            lastName: "",
            dob: toDateInput(initialDob),
            revealDate: toDateInput(initialReveal),
          }}
        />
      )}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-1.5">
        {label}
      </span>
      <div className="px-3 py-2.5 rounded-lg border border-navy/10 bg-[#f9f8f6] text-[14px] text-ink-light">
        {value}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}
