"use client";

import { useEffect, useState, type FormEvent } from "react";

type OrgRow = {
  id: string;
  name: string;
  billingContactEmail: string | null;
  notes: string | null;
  memberCount: number;
  capsuleCount: number;
  ownerName: string;
  ownerEmail: string | null;
  createdAt: string;
};

export function OrgsClient() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orgs");
      if (!res.ok) throw new Error("Failed to load orgs.");
      const data = (await res.json()) as { orgs: OrgRow[] };
      setOrgs(data.orgs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          ownerEmail: ownerEmail.trim(),
          billingContactEmail: billingEmail.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't create org.");
      }
      setName("");
      setOwnerEmail("");
      setBillingEmail("");
      setNotes("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-extrabold text-navy tracking-[-0.5px] mb-4">
          Organizations
        </h1>
        <p className="text-sm text-ink-mid max-w-[640px]">
          Phase 1 enterprise channel — provision orgs here. The OWNER must
          already have an untilThen account. Once created they&rsquo;ll see an
          &ldquo;Enterprise&rdquo; tab in their TopNav and can manage their
          roster from <code className="text-[12px]">/enterprise</code>.
        </p>
      </section>

      <section className="rounded-xl border border-navy/[0.08] bg-white p-6">
        <h2 className="text-[15px] font-bold text-navy mb-4">Create org</h2>
        <form onSubmit={create} className="space-y-3 max-w-[520px]">
          <Field label="Organization name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Acme Co."
              className="account-input"
            />
          </Field>
          <Field label="Owner email">
            <input
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
              placeholder="founder@acme.com"
              className="account-input"
            />
          </Field>
          <Field label="Billing contact email (optional)">
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="ap@acme.com"
              className="account-input"
            />
          </Field>
          <Field label="Internal notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Renewal date, contract terms, who closed the deal…"
              rows={3}
              className="account-input"
            />
          </Field>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="bg-navy text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-navy/90 transition-colors disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create org"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-[15px] font-bold text-navy mb-3">
          All orgs · {orgs.length}
        </h2>
        {loading ? (
          <p className="text-sm text-ink-light">Loading…</p>
        ) : orgs.length === 0 ? (
          <p className="text-sm text-ink-light italic">
            No organizations yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {orgs.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-navy/[0.08] bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-navy">{o.name}</div>
                    <div className="text-xs text-ink-light mt-0.5">
                      Owner: {o.ownerName}{" "}
                      {o.ownerEmail && (
                        <span className="text-ink-light/70">
                          ({o.ownerEmail})
                        </span>
                      )}
                    </div>
                    {o.billingContactEmail && (
                      <div className="text-xs text-ink-light mt-0.5">
                        Billing: {o.billingContactEmail}
                      </div>
                    )}
                    {o.notes && (
                      <div className="text-xs text-ink-light/80 mt-1.5 italic">
                        {o.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 text-[11px] text-ink-light">
                    <div>
                      {o.memberCount}{" "}
                      {o.memberCount === 1 ? "member" : "members"}
                    </div>
                    <div>
                      {o.capsuleCount}{" "}
                      {o.capsuleCount === 1 ? "capsule" : "capsules"}
                    </div>
                    <div className="mt-1 text-[10px]">
                      {new Date(o.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold tracking-[0.12em] uppercase text-ink-mid mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
