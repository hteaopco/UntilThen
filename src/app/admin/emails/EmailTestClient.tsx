"use client";

import { useState } from "react";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  bodyPreview: string;
  trigger: string;
  frequency: string;
  funnel: string;
};

const TEMPLATES: EmailTemplate[] = [
  {
    id: "capsule-invite",
    name: "#1 Invite Contributor",
    subject: "Margaret will read this one day.",
    bodyPreview: "You've been invited to leave something for Margaret. A message. A memory. A moment they'll open in the future.",
    trigger: "Contributor added to Gift Capsule",
    frequency: "On event",
    funnel: "Acquisition",
  },
  {
    id: "draft-saved",
    name: "#2 Draft Saved",
    subject: "You started something meaningful.",
    bodyPreview: "Your capsule is saved. Come back anytime to finish it — invite people, add memories, and make it something they'll never forget.",
    trigger: "Organiser creates Gift Capsule draft",
    frequency: "On event",
    funnel: "Activation",
  },
  {
    id: "draft-expiring",
    name: "#3 Draft Expiring",
    subject: "Don't lose this.",
    bodyPreview: "Your capsule expires tomorrow. You've already started something meaningful — don't let it disappear.",
    trigger: "Draft is 6 days old",
    frequency: "Cron (not wired)",
    funnel: "Completion",
  },
  {
    id: "capsule-activated",
    name: "#4 Capsule Activated",
    subject: "It's happening.",
    bodyPreview: "Your capsule is live. Invites are going out. People are about to start writing.",
    trigger: "Organiser activates / pays",
    frequency: "On event",
    funnel: "Completion",
  },
  {
    id: "contribution-submitted",
    name: "#5 Contribution Submitted",
    subject: "Someone just added something for Margaret",
    bodyPreview: "A new memory was added to your capsule. You can review it, edit it, or approve it before it's sealed.",
    trigger: "Contributor submits → sent to organiser",
    frequency: "On event",
    funnel: "Activation",
  },
  {
    id: "contributor-reminder",
    name: "#6 Contributor Reminder",
    subject: "Don't miss this.",
    bodyPreview: "You were invited to leave a message for Margaret. Take a minute to write something they'll keep forever.",
    trigger: "48hr before contributor deadline",
    frequency: "Cron (not wired)",
    funnel: "Engagement",
  },
  {
    id: "reveal-day",
    name: "#7 Reveal Day",
    subject: "It's time.",
    bodyPreview: "Today is the day. There are messages waiting for you — written in the past, meant for right now.",
    trigger: "Reveal date arrives",
    frequency: "Cron (every 15 min)",
    funnel: "Anticipation",
  },
  {
    id: "new-link",
    name: "#8 New Link",
    subject: "Here's your new link",
    bodyPreview: "Your messages are waiting. We've generated a new link for you. Whenever you're ready, everything is waiting.",
    trigger: "Recipient requests fresh magic link",
    frequency: "On event",
    funnel: "Retention",
  },
  {
    id: "capsule-saved",
    name: "#9 Capsule Saved",
    subject: "This is yours now.",
    bodyPreview: "Your capsule is saved to your account. You can return anytime to revisit what was written for you.",
    trigger: "Recipient creates account after opening",
    frequency: "On event",
    funnel: "Activation",
  },
  {
    id: "contributor-confirmation",
    name: "#10 Contributor Confirmation",
    subject: "This is going to mean everything to them.",
    bodyPreview: "Your message is saved. One day, they'll read this. You can still edit it before it's sealed.",
    trigger: "Contributor submits → sent to contributor",
    frequency: "On event",
    funnel: "Activation",
  },
  {
    id: "contributor-approved",
    name: "#11 Contributor Approved",
    subject: "Your message is in.",
    bodyPreview: "Your contribution has been approved. It's now part of what they'll open one day.",
    trigger: "Organiser/admin approves contribution",
    frequency: "On event",
    funnel: "Engagement",
  },
  {
    id: "contributor-rejected",
    name: "#12 Contributor Rejected",
    subject: "Small update needed",
    bodyPreview: "Your message needs a quick update before it's approved. Take a moment to revise it.",
    trigger: "Organiser/admin rejects contribution",
    frequency: "On event",
    funnel: "Engagement",
  },
  {
    id: "invite-accepted",
    name: "#13 Invite Accepted",
    subject: "Someone just joined you",
    bodyPreview: "They accepted your invite. They're about to add something meaningful.",
    trigger: "Vault contributor accepts → sent to parent",
    frequency: "On event",
    funnel: "Engagement",
  },
  {
    id: "entry-needs-review",
    name: "#14 Entry Needs Review",
    subject: "Something new is waiting",
    bodyPreview: "A new entry has been added. Take a moment to review it before it's sealed.",
    trigger: "Vault contributor seals entry → sent to parent",
    frequency: "On event",
    funnel: "Engagement",
  },
  {
    id: "entry-approved",
    name: "#15 Entry Approved",
    subject: "It's been added",
    bodyPreview: "Your entry has been approved. It's now part of what they'll open one day.",
    trigger: "Parent approves → sent to vault contributor",
    frequency: "On event",
    funnel: "Engagement",
  },
  {
    id: "entry-rejected",
    name: "#16 Entry Rejected",
    subject: "Almost there",
    bodyPreview: "Your entry needs a quick update. Make the change and resubmit.",
    trigger: "Parent rejects → sent to vault contributor",
    frequency: "On event",
    funnel: "Engagement",
  },
  {
    id: "account-deleted",
    name: "#17 Account Deleted",
    subject: "Your account has been deleted",
    bodyPreview: "Your account has been successfully deleted. If you ever decide to return, we'll be here.",
    trigger: "User deletes account",
    frequency: "On event",
    funnel: "Retention",
  },
  {
    id: "writing-reminder",
    name: "#18 Writing Reminder",
    subject: "Don't forget this version of them.",
    bodyPreview: "It's been a while since your last memory. Take a minute to write something — even small moments matter.",
    trigger: "Parent hasn't written in 30+ days",
    frequency: "Cron (weekly Mon 9am)",
    funnel: "Engagement",
  },
  {
    id: "countdown-30",
    name: "#19a Countdown 30 Days",
    subject: "One month from now",
    bodyPreview: "They'll open everything. Still time to add more memories before the big reveal.",
    trigger: "30 days before vault reveal",
    frequency: "Cron (daily 9am)",
    funnel: "Anticipation",
  },
  {
    id: "countdown-7",
    name: "#19b Countdown 7 Days",
    subject: "One week to go",
    bodyPreview: "They're about to see it all. Last chance to add anything before it opens.",
    trigger: "7 days before vault reveal",
    frequency: "Cron (daily 9am)",
    funnel: "Anticipation",
  },
  {
    id: "countdown-1",
    name: "#19c Countdown 1 Day",
    subject: "Tomorrow changes everything",
    bodyPreview: "It's almost time. The capsule opens tomorrow.",
    trigger: "1 day before vault reveal",
    frequency: "Cron (daily 9am)",
    funnel: "Anticipation",
  },
  {
    id: "couple-invite",
    name: "#1 Couple Variant",
    subject: "Ann & Bob will read this one day.",
    bodyPreview: "You've been invited to leave something for Ann & Bob. A message. A memory. A moment they'll open in the future.",
    trigger: "Couple Gift Capsule invite",
    frequency: "On event",
    funnel: "Acquisition",
  },
];

const FUNNEL_COLORS: Record<string, string> = {
  Acquisition: "text-amber bg-amber-tint",
  Activation: "text-sage bg-sage-tint",
  Completion: "text-gold bg-gold-tint",
  Engagement: "text-navy bg-[#eef1f5]",
  Anticipation: "text-amber-dark bg-amber-tint",
  Retention: "text-ink-mid bg-[#f1f5f9]",
};

export function EmailTestClient() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  function toggleAll() {
    if (selected.size === TEMPLATES.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(TEMPLATES.map((t) => t.id)));
    }
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function sendEmails() {
    if (!email.trim() || selected.size === 0) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/test-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: email.trim(), only: Array.from(selected) }),
      });
      const data = (await res.json()) as { sent: number; failed: number };
      setResult(data);
    } catch {
      setResult({ sent: 0, failed: selected.size });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <label className="block flex-1 min-w-[240px]">
          <span className="block text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1.5">
            Send to
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="account-input"
          />
        </label>
        <button
          type="button"
          onClick={sendEmails}
          disabled={sending || !email.trim() || selected.size === 0}
          className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-50"
        >
          {sending ? "Sending\u2026" : `Send ${selected.size} of ${TEMPLATES.length} emails`}
        </button>
      </div>

      {result && (
        <div className={`mb-4 rounded-lg px-4 py-2.5 text-sm font-semibold ${
          result.failed === 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {result.sent} sent, {result.failed} failed
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-navy/10 text-[10px] uppercase tracking-[0.08em] text-ink-mid">
              <th className="py-2 pr-2 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === TEMPLATES.length}
                  onChange={toggleAll}
                  className="accent-amber"
                />
              </th>
              <th className="py-2 pr-3 text-left font-bold">Email</th>
              <th className="py-2 pr-3 text-left font-bold">Subject</th>
              <th className="py-2 pr-3 text-left font-bold hidden lg:table-cell">Body Preview</th>
              <th className="py-2 pr-3 text-left font-bold hidden sm:table-cell">Trigger</th>
              <th className="py-2 pr-3 text-left font-bold hidden sm:table-cell">Frequency</th>
              <th className="py-2 text-left font-bold">Funnel</th>
            </tr>
          </thead>
          <tbody>
            {TEMPLATES.map((t) => (
              <tr key={t.id} className="border-b border-navy/[0.04] hover:bg-warm-surface/40 align-top">
                <td className="py-2.5 pr-2">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggle(t.id)}
                    className="accent-amber"
                  />
                </td>
                <td className="py-2.5 pr-3">
                  <div className="font-semibold text-navy whitespace-nowrap">{t.name}</div>
                  <div className="lg:hidden text-xs text-ink-light leading-[1.5] mt-1">{t.bodyPreview}</div>
                  <div className="sm:hidden text-[10px] text-ink-light mt-1">{t.trigger} · {t.frequency}</div>
                </td>
                <td className="py-2.5 pr-3 text-ink-mid italic">{t.subject}</td>
                <td className="py-2.5 pr-3 text-ink-light text-xs leading-[1.5] max-w-[300px] hidden lg:table-cell">{t.bodyPreview}</td>
                <td className="py-2.5 pr-3 text-ink-mid text-xs hidden sm:table-cell">{t.trigger}</td>
                <td className="py-2.5 pr-3 text-ink-mid text-xs whitespace-nowrap hidden sm:table-cell">{t.frequency}</td>
                <td className="py-2.5">
                  <span className={`text-[9px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded ${FUNNEL_COLORS[t.funnel] ?? ""}`}>
                    {t.funnel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
