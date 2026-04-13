"use client";

import { useState, type FormEvent } from "react";

import { captureEvent } from "@/components/PosthogProvider";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,}$/;

const HEAR_ABOUT_OPTIONS = [
  "A friend told me",
  "Social media",
  "Google / search",
  "Podcast",
  "Press / article",
  "Other",
];

type Status = "idle" | "loading" | "success" | "error";

export function WaitlistForm() {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [topError, setTopError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{ name: string; email: string } | null>(
    null,
  );

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [numChildren, setNumChildren] = useState<number | null>(null);
  const [hearAboutUs, setHearAboutUs] = useState("");

  const triggerExpand = () => {
    if (!expanded) {
      setExpanded(true);
      captureEvent("waitlist_form_started");
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!EMAIL_RE.test(email.trim())) {
      errs.email = "Please enter a valid email.";
    }
    if (expanded) {
      if (!firstName.trim()) errs.firstName = "First name is required.";
      if (!lastName.trim()) errs.lastName = "Last name is required.";
      if (!numChildren) errs.numChildren = "Please choose one.";
      if (phone.trim() && !PHONE_RE.test(phone.trim())) {
        errs.phone = "That doesn't look right.";
      }
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth);
        if (Number.isNaN(dob.getTime())) {
          errs.dateOfBirth = "Invalid date.";
        } else {
          const ageMs = Date.now() - dob.getTime();
          const age = ageMs / (1000 * 60 * 60 * 24 * 365.25);
          if (age < 18) errs.dateOfBirth = "You must be 18 or older.";
        }
      }
    }
    return errs;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTopError(null);

    // Tapping "Join waitlist" before expansion should just open the form
    // rather than try to submit with only an email.
    if (!expanded) {
      triggerExpand();
      return;
    }

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      captureEvent("waitlist_validation_error", { field: Object.keys(errs)[0] });
      return;
    }
    setFieldErrors({});
    setStatus("loading");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          numChildren,
          hearAboutUs: hearAboutUs || undefined,
        }),
      });

      if (res.status === 409) {
        setStatus("error");
        setTopError("You're already on the list! We'll be in touch.");
        captureEvent("waitlist_duplicate_email");
        return;
      }

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }

      setSuccess({ name: firstName.trim(), email: email.trim() });
      setStatus("success");
      captureEvent("waitlist_signup_completed", {
        num_children: numChildren,
        hear_about_us: hearAboutUs || null,
        has_phone: Boolean(phone.trim()),
        has_dob: Boolean(dateOfBirth),
      });
    } catch (err) {
      setStatus("error");
      setTopError((err as Error).message);
    }
  };

  if (status === "success" && success) {
    return <SuccessCard name={success.name} email={success.email} />;
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-[520px] text-left">
      {/* Collapsed pill: email + "Join waitlist" button on one line */}
      {!expanded && (
        <div className="flex max-w-[520px] mx-auto rounded-[10px] overflow-hidden border border-navy/[0.08] shadow-[0_4px_20px_rgba(15,31,61,0.12)] hover:shadow-[0_10px_32px_rgba(74,158,221,0.22)] focus-within:shadow-[0_10px_32px_rgba(74,158,221,0.28)] transition-shadow">
          <input
            type="email"
            required
            value={email}
            onFocus={triggerExpand}
            onChange={(e) => {
              setEmail(e.target.value);
              triggerExpand();
            }}
            placeholder="your@email.com"
            aria-label="Email address"
            autoComplete="email"
            className="flex-1 px-5 py-[15px] text-sm font-normal bg-white text-navy placeholder-ink-light outline-none"
          />
          <button
            type="submit"
            className="bg-navy text-white px-[22px] py-[15px] text-[13px] font-bold whitespace-nowrap hover:bg-navy-mid transition-colors"
          >
            Join waitlist →
          </button>
        </div>
      )}

      {/* Expanded form */}
      <div
        aria-hidden={!expanded}
        className="overflow-hidden transition-[max-height,opacity] duration-300 ease-out"
        style={{
          maxHeight: expanded ? "1600px" : "0",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="pt-1 space-y-5">
          <Field
            label="Email address"
            required
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="your@email.com"
            autoComplete="email"
            error={fieldErrors.email}
            disabled={status === "loading"}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="First name"
              required
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
              error={fieldErrors.firstName}
              disabled={status === "loading"}
            />
            <Field
              label="Last name"
              required
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
              error={fieldErrors.lastName}
              disabled={status === "loading"}
            />
          </div>

          <div>
            <Label required>How many children do you have?</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setNumChildren(n);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.numChildren;
                      return next;
                    });
                  }}
                  aria-pressed={numChildren === n}
                  disabled={status === "loading"}
                  className={`flex-1 min-h-[44px] rounded-full border-2 text-sm font-bold tracking-[0.02em] transition-all ${
                    numChildren === n
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-ink-mid border-navy/15 hover:border-navy/40"
                  } disabled:opacity-50`}
                >
                  {n === 4 ? "4+" : n}
                </button>
              ))}
            </div>
            {fieldErrors.numChildren && (
              <FieldError>{fieldErrors.numChildren}</FieldError>
            )}
          </div>

          <Field
            label="Phone number"
            optional
            hint="For a launch day text. Nothing else."
            type="tel"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            error={fieldErrors.phone}
            disabled={status === "loading"}
          />

          <Field
            label="Date of birth"
            optional
            hint="Helps us understand who we're building for."
            type="date"
            value={dateOfBirth}
            onChange={setDateOfBirth}
            autoComplete="bday"
            error={fieldErrors.dateOfBirth}
            disabled={status === "loading"}
          />

          <div>
            <Label>How did you hear about us?</Label>
            <select
              value={hearAboutUs}
              onChange={(e) => setHearAboutUs(e.target.value)}
              disabled={status === "loading"}
              className="w-full min-h-[44px] px-4 rounded-lg border border-navy/15 text-navy bg-white focus:outline-none focus:border-sky focus:ring-2 focus:ring-sky/20 text-sm disabled:opacity-50"
            >
              <option value="">Select one…</option>
              {HEAR_ABOUT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-navy text-white py-3.5 rounded-lg text-sm font-bold tracking-[0.01em] hover:bg-navy-mid transition-colors disabled:opacity-60"
            >
              {status === "loading" ? "Joining…" : "Complete signup →"}
            </button>
            <p className="mt-3 text-xs italic text-ink-light text-center">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </div>
      </div>

      {topError && (
        <p className="mt-4 text-sm text-red-600 text-center" role="alert">
          {topError}
        </p>
      )}
    </form>
  );
}

function Field({
  label,
  required,
  optional,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  error,
  disabled,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label required={required} optional={optional}>
        {label}
      </Label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className={`w-full min-h-[44px] px-4 rounded-lg border text-sm text-navy bg-white placeholder-ink-light focus:outline-none focus:ring-2 focus:ring-sky/20 disabled:opacity-50 ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-navy/15 focus:border-sky"
        }`}
      />
      {hint && !error && (
        <p className="mt-1 text-xs italic text-ink-light">{hint}</p>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

function Label({
  children,
  required,
  optional,
}: {
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-2">
      {children}
      {required && <span className="ml-1 text-red-500 normal-case">*</span>}
      {optional && (
        <span className="ml-1 text-ink-light font-medium normal-case tracking-normal text-[10px] italic">
          (optional)
        </span>
      )}
    </label>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {children}
    </p>
  );
}

function SuccessCard({ name, email }: { name: string; email: string }) {
  return (
    <div
      className="mx-auto max-w-[520px] rounded-2xl bg-sky-tint px-8 py-10 text-center"
      role="status"
    >
      <div className="text-4xl mb-4" aria-hidden="true">
        💌
      </div>
      <h3 className="text-2xl font-extrabold text-navy tracking-[-0.5px] mb-3">
        You&rsquo;re on the list, {name}.
      </h3>
      <p className="text-ink-mid leading-relaxed mb-4">
        We&rsquo;ll be in touch soon. In the meantime, maybe think about what
        you&rsquo;d write in your first letter.
      </p>
      <p className="text-sm text-ink-light italic">
        We&rsquo;ll email you at {email} when we launch.
      </p>
    </div>
  );
}
