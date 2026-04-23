"use client";

import {
  HelpCircle,
  Lock,
  MinusCircle,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AddOnCheckout } from "@/components/checkout/AddOnCheckout";
import { SubscriptionCheckout } from "@/components/checkout/SubscriptionCheckout";
import { UpdateCardForm } from "@/components/checkout/UpdateCardForm";
import { formatLong } from "@/lib/dateFormatters";

type Plan = "MONTHLY" | "ANNUAL";
type Status = "ACTIVE" | "CANCELLED" | "PAST_DUE" | "LOCKED";

type Subscription = {
  plan: Plan;
  status: Status;
  baseCapsuleCount: number;
  addonCapsuleCount: number;
  currentPeriodEndIso: string;
  pendingPlan: Plan | null;
  pendingEffectiveDateIso: string | null;
};

type Capsule = {
  childId: string;
  vaultId: string | null;
  firstName: string;
  isLocked: boolean;
  /** Most recent MANUAL lock/unlock toggle. Auto-locks from
   *  addon removal don't set this. */
  lastLockToggleAtIso: string | null;
};

/** Cooldown days kept in sync with TOGGLE_COOLDOWN_DAYS in
 *  src/app/api/account/vaults/[id]/lock/route.ts. */
const LOCK_COOLDOWN_DAYS = 90;

function addDays(iso: string, days: number): Date {
  return new Date(new Date(iso).getTime() + days * 86400000);
}

export type BillingClientProps = {
  capsuleCount: number;
  photoCount: number;
  voiceCount: number;
  videoCount: number;
  hasCustomerOnFile: boolean;
  cardBrand: string | null;
  cardLast4: string | null;
  freeVaultAccess: boolean;
  capsules: Capsule[];
  subscription: Subscription | null;
  squareApplicationId: string;
  squareLocationId: string;
};

type Mode = "idle" | "subscribe" | "addon" | "confirm-cancel" | "update-card";

export function BillingClient({
  capsuleCount,
  photoCount,
  voiceCount,
  videoCount,
  hasCustomerOnFile,
  cardBrand,
  cardLast4,
  freeVaultAccess,
  capsules,
  subscription,
  squareApplicationId,
  squareLocationId,
}: BillingClientProps) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("idle");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sub = subscription;
  const planLabel = sub?.plan === "ANNUAL" ? "Annual" : sub ? "Monthly" : "";
  const basePriceCopy =
    sub?.plan === "ANNUAL" ? "$35.99 / year" : "$4.99 / month";
  const addonPriceCopy =
    sub?.plan === "ANNUAL" ? "$6 / year" : "$0.99 / month";
  const slotCount = sub ? sub.baseCapsuleCount + sub.addonCapsuleCount : 0;
  const activeCount = capsules.filter((c) => !c.isLocked).length;
  const lockedCount = capsules.length - activeCount;

  const pendingLabel =
    sub?.pendingPlan === "ANNUAL" ? "Annual" : sub?.pendingPlan === "MONTHLY" ? "Monthly" : null;

  async function switchPlan(targetPlan: Plan) {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/switch-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlan }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't switch plan.");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function resumeSubscription() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/resume-subscription", {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          lapsed?: boolean;
        };
        if (data.lapsed) {
          // Access already ended — drop straight into the normal
          // subscribe flow with card on file.
          setMode("subscribe");
          return;
        }
        throw new Error(data.error ?? "Couldn't resume subscription.");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function cancelSubscription() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/cancel-subscription", {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't cancel subscription.");
      }
      setMode("idle");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function removeAddon() {
    if (!confirm("Remove one add-on? Your paid slots drop by one.")) return;
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/remove-addon", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't remove the add-on.");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  async function toggleLock(vaultId: string, isLocked: boolean) {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/vaults/${vaultId}/lock`, {
        method: isLocked ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't update capsule lock state.");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  if (mode === "subscribe") {
    return (
      <div className="max-w-[520px] mx-auto">
        <SubscriptionCheckout
          applicationId={squareApplicationId}
          locationId={squareLocationId}
          onDone={() => {
            setMode("idle");
            router.refresh();
          }}
          onCancel={() => setMode("idle")}
        />
      </div>
    );
  }

  if (mode === "addon" && sub) {
    return (
      <div className="max-w-[520px] mx-auto">
        <AddOnCheckout
          plan={sub.plan}
          usedSlots={capsuleCount}
          onDone={() => {
            setMode("idle");
            router.refresh();
          }}
          onCancel={() => setMode("idle")}
        />
      </div>
    );
  }

  if (mode === "update-card") {
    return (
      <div className="max-w-[520px] mx-auto">
        <UpdateCardForm
          applicationId={squareApplicationId}
          locationId={squareLocationId}
          onDone={() => {
            setMode("idle");
            router.refresh();
          }}
          onCancel={() => setMode("idle")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Billing
        </p>
        <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-2">
          Your plan
        </h2>
        <p className="text-sm text-ink-mid">
          Manage your subscription, capsules, and payment method.
        </p>
      </section>

      {freeVaultAccess && (
        <section className="rounded-xl border border-sage/40 bg-sage-tint/50 px-5 py-4">
          <p className="text-sm font-semibold text-navy">
            You have complimentary access.
          </p>
          <p className="text-xs text-ink-mid mt-1">
            All vault features are unlocked on your account — no charges.
          </p>
        </section>
      )}

      {!sub && !freeVaultAccess && (
        <section className="rounded-2xl border border-navy/[0.08] bg-white px-6 py-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber mb-1.5">
                Current plan
              </div>
              <div className="text-2xl font-extrabold text-navy tracking-[-0.3px]">
                No active subscription
              </div>
              <div className="text-sm text-ink-mid mt-1">
                Start a subscription to write to a time capsule — $4.99/month or $35.99/year.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMode("subscribe")}
              className="inline-flex items-center gap-2 bg-amber text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              <Lock size={16} strokeWidth={1.5} aria-hidden="true" />
              Start a subscription
            </button>
          </div>
        </section>
      )}

      {sub && (
        <section className="rounded-2xl border border-navy/[0.08] bg-white px-6 py-6 space-y-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-amber mb-1.5">
                Current plan
              </div>
              <div className="text-2xl font-extrabold text-navy tracking-[-0.3px]">
                Base Plan · {planLabel}
              </div>
              <div className="text-sm text-ink-mid mt-1">
                {sub.status === "CANCELLED"
                  ? `Access through ${formatLong(sub.currentPeriodEndIso)}`
                  : `Renews ${formatLong(sub.currentPeriodEndIso)}`}
              </div>
            </div>

            {sub.status === "ACTIVE" && !sub.pendingPlan && (
              <button
                type="button"
                onClick={() =>
                  switchPlan(sub.plan === "ANNUAL" ? "MONTHLY" : "ANNUAL")
                }
                disabled={working}
                className="inline-flex items-center gap-2 bg-amber text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
              >
                {sub.plan === "ANNUAL" ? (
                  <>
                    <TrendingDown size={16} strokeWidth={1.5} aria-hidden="true" />
                    Switch to Monthly
                  </>
                ) : (
                  <>
                    <TrendingUp size={16} strokeWidth={1.5} aria-hidden="true" />
                    Upgrade to Annual — save 40%
                  </>
                )}
              </button>
            )}
          </div>

          {/* Itemized plan line items. */}
          <div className="border-t border-navy/[0.06] pt-4">
            <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-3">
              Plan items
            </div>
            <ul className="divide-y divide-navy/[0.06]">
              <li className="py-3 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-navy">
                      Base plan · {sub.baseCapsuleCount} capsules
                    </div>
                    <div className="text-xs text-ink-light mt-0.5">
                      Cancels everything below with it.
                    </div>
                  </div>
                  <div className="font-bold text-navy tabular-nums text-right whitespace-nowrap">
                    {basePriceCopy}
                  </div>
                </div>
              </li>
              {Array.from({ length: sub.addonCapsuleCount }).map((_, i) => {
                const isLast = i === sub.addonCapsuleCount - 1;
                return (
                  <li key={i} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-navy">
                          Add-on capsule #{i + 1}
                        </div>
                        <div className="text-xs text-ink-light mt-0.5">
                          Extra slot on top of the base plan.
                        </div>
                      </div>
                      <div className="font-bold text-navy tabular-nums text-right whitespace-nowrap">
                        +{addonPriceCopy}
                      </div>
                    </div>
                    {sub.status === "ACTIVE" && isLast && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={removeAddon}
                          disabled={working}
                          className="inline-flex items-center gap-1 text-[12px] font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                        >
                          <MinusCircle
                            size={14}
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          Remove
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 pt-3 border-t border-navy/[0.06] flex items-center justify-between text-[14px]">
              <span className="text-ink-mid">
                {capsules.length} capsule{capsules.length === 1 ? "" : "s"} ·{" "}
                {activeCount} active{lockedCount > 0 ? ` · ${lockedCount} locked` : ""} ·{" "}
                {slotCount} paid slot{slotCount === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          {sub.status === "ACTIVE" && (
            <div className="border-t border-navy/[0.06] pt-4">
              <button
                type="button"
                onClick={() => setMode("addon")}
                disabled={working}
                className="inline-flex items-center gap-2 text-[13px] font-semibold text-amber hover:text-amber-dark disabled:opacity-60"
              >
                <PlusCircle size={14} strokeWidth={1.75} aria-hidden="true" />
                Add another capsule slot ({addonPriceCopy})
              </button>
            </div>
          )}

          {pendingLabel && sub.pendingEffectiveDateIso && (
            <div className="rounded-xl border border-gold/40 bg-gold-tint/40 px-4 py-3">
              <p className="text-sm font-semibold text-navy">
                Switching to {pendingLabel} on{" "}
                {formatLong(sub.pendingEffectiveDateIso)}.
              </p>
              <p className="text-xs text-ink-mid mt-1">
                Your current plan runs until then. The new plan starts
                billing that day.
              </p>
            </div>
          )}

          {sub.status === "CANCELLED" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-800">
                  Subscription cancelled.
                </p>
                <p className="text-xs text-red-700/90 mt-1">
                  You&rsquo;ll keep access until{" "}
                  {formatLong(sub.currentPeriodEndIso)}. After that, every
                  capsule locks (data is kept).
                </p>
              </div>
              {new Date(sub.currentPeriodEndIso).getTime() > Date.now() ? (
                <button
                  type="button"
                  onClick={resumeSubscription}
                  disabled={working}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
                >
                  {working ? "Resuming…" : "Resume subscription"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setMode("subscribe")}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors"
                >
                  Start a subscription
                </button>
              )}
            </div>
          )}

          {sub.status === "PAST_DUE" && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-800">
                Your last payment failed.
              </p>
              <p className="text-xs text-red-700/90 mt-1">
                Update your card to keep your subscription active.
              </p>
            </div>
          )}
        </section>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {capsules.length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
            Your capsules
          </div>
          <p className="text-xs text-ink-mid mb-3 max-w-[560px]">
            Lock a capsule to free up its slot without losing data. Locked
            capsules stay readable — you just can&rsquo;t add new memories
            until you unlock them again.
          </p>
          <ul className="space-y-2">
            {capsules.map((c) => (
              <li
                key={c.childId}
                className="rounded-xl border border-navy/[0.08] bg-white px-4 py-3 flex items-start justify-between gap-3 flex-wrap"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    aria-hidden="true"
                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      c.isLocked
                        ? "bg-navy/10 text-ink-mid"
                        : "bg-sage-tint text-sage"
                    }`}
                  >
                    <Lock size={14} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-navy">
                      {c.firstName}&rsquo;s capsule
                    </div>
                    <div className="text-xs text-ink-light mt-0.5">
                      {c.isLocked ? "Locked · read-only" : "Active"}
                    </div>
                    {c.lastLockToggleAtIso && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-light leading-[1.5]">
                        <div className="flex-1 min-w-0">
                          <div>
                            Last change: {formatLong(c.lastLockToggleAtIso)}
                          </div>
                          <div>
                            Throttle lifted:{" "}
                            {formatLong(
                              addDays(
                                c.lastLockToggleAtIso,
                                LOCK_COOLDOWN_DAYS,
                              ).toISOString(),
                            )}
                          </div>
                        </div>
                        <ThrottleHelp />
                      </div>
                    )}
                  </div>
                </div>
                {c.vaultId && sub?.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => toggleLock(c.vaultId!, c.isLocked)}
                    disabled={working}
                    className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-60 ${
                      c.isLocked
                        ? "border-amber/40 text-amber hover:bg-amber-tint"
                        : "border-navy/15 text-ink-mid hover:border-navy hover:text-navy"
                    }`}
                  >
                    {c.isLocked ? "Unlock" : "Lock"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Usage
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <UsageCell label="Time capsules" value={`${capsuleCount}`} />
          <UsageCell label="Photos" value={`${photoCount}`} />
          <UsageCell label="Voice notes" value={`${voiceCount}`} />
          <UsageCell label="Video clips" value={`${videoCount}`} />
        </dl>
      </section>

      <section>
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Payment method
        </div>
        <div className="rounded-xl border border-navy/[0.08] bg-white px-5 py-5 flex items-center justify-between gap-3 flex-wrap">
          {hasCustomerOnFile ? (
            <>
              <div className="flex items-center gap-2 text-sm text-navy">
                <Lock size={14} strokeWidth={1.75} aria-hidden="true" />
                {cardBrand && cardLast4 ? (
                  <span>
                    <span className="font-semibold">
                      {formatBrand(cardBrand)}
                    </span>{" "}
                    <span className="text-ink-mid">•••• {cardLast4}</span>
                  </span>
                ) : (
                  <span className="text-ink-mid">
                    Card on file · managed by Square
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMode("update-card")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy/15 text-[12px] font-semibold text-navy hover:border-amber hover:text-amber transition-colors"
              >
                Update
              </button>
            </>
          ) : (
            <p className="text-sm text-ink-mid">
              No payment method on file yet. You&rsquo;ll be prompted for
              one when you start a subscription or activate a gift capsule.
            </p>
          )}
        </div>
      </section>

      {sub && sub.status === "ACTIVE" && (
        <section className="pt-6 border-t border-navy/[0.06]">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-red-600 mb-3">
            Danger zone
          </p>

          {mode !== "confirm-cancel" ? (
            <button
              type="button"
              onClick={() => setMode("confirm-cancel")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-[1.5px] border-red-600 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors"
            >
              <X size={16} strokeWidth={1.5} aria-hidden="true" />
              Cancel entire subscription
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-5 max-w-[560px]">
              <p className="text-sm text-red-800 font-semibold mb-2">
                Cancel your subscription?
              </p>
              <p className="text-sm text-red-700/90 mb-4 leading-[1.6]">
                This cancels the base plan and every add-on. Your
                subscription will remain active until{" "}
                {formatLong(sub.currentPeriodEndIso)}. After that, every
                capsule locks (data is kept). You can resubscribe any time
                to unlock them again.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={cancelSubscription}
                  disabled={working}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
                >
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                  {working ? "Cancelling…" : "Cancel subscription"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("idle")}
                  disabled={working}
                  className="text-sm font-semibold text-ink-mid hover:text-navy px-2 py-2 disabled:opacity-50"
                >
                  Never mind
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/** Normalise Square's uppercase card brand strings ("VISA",
 *  "MASTERCARD", "AMERICAN_EXPRESS") into display form. */
function formatBrand(brand: string): string {
  const map: Record<string, string> = {
    VISA: "Visa",
    MASTERCARD: "Mastercard",
    AMERICAN_EXPRESS: "Amex",
    DISCOVER: "Discover",
    DISCOVER_DINERS: "Diners",
    JCB: "JCB",
    UNION_PAY: "UnionPay",
    CHINA_UNION_PAY: "UnionPay",
  };
  return (
    map[brand] ??
    brand
      .toLowerCase()
      .split("_")
      .map((w) => w[0]?.toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function UsageCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-navy/[0.08] bg-white px-4 py-3">
      <dt className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid">
        {label}
      </dt>
      <dd className="mt-1 text-base font-bold text-navy tabular-nums">
        {value}
      </dd>
    </div>
  );
}

/** Question-mark pill that pops a tooltip explaining the 90-day
 *  lock/unlock throttle. Click-to-toggle + outside-click-to-close
 *  so it works on mobile (hover is unreliable on touch). */
function ThrottleHelp() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="About the lock cooldown"
        className="w-5 h-5 rounded-full flex items-center justify-center text-ink-light hover:text-navy transition-colors"
      >
        <HelpCircle size={14} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-6 w-[240px] z-20 rounded-xl border border-navy/10 bg-white shadow-[0_8px_24px_rgba(15,31,61,0.12)] px-4 py-3 text-[12px] text-ink-mid leading-[1.55]"
        >
          <p className="font-semibold text-navy mb-1">Lock cooldown</p>
          <p>
            Each capsule can be locked or unlocked once every 90 days.
            Stops anyone from rotating one paid slot across multiple
            capsules to get extra write access for free.
          </p>
        </div>
      )}
    </div>
  );
}
