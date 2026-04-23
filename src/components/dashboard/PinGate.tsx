"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

// Opt-in PIN gate for the authenticated app surface. Wraps the
// dashboard layout children: if the signed-in user has a PIN
// set AND this tab's session hasn't been unlocked, renders the
// full-screen lock. Otherwise renders children verbatim.
//
// Unlock is stored in sessionStorage — session-only by design
// (matches the product spec). Opening a new tab forces a fresh
// unlock. Sign-out clears session storage implicitly.

const UNLOCK_KEY = "untilthen:vault-unlocked";

type Screen =
  | "checking"
  | "locked"
  | "wrong"
  | "unlocking"
  | "unlocked"
  | "forgot-confirm"
  | "forgot-sent"
  | "forgot-error";

export function PinGate({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>("checking");
  const [pin, setPin] = useState("");
  const [sending, setSending] = useState(false);

  // On mount: is this session already unlocked? If yes skip
  // the status fetch entirely so we don't block children render.
  // Otherwise ask the API whether the user even has a PIN set.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === "true") {
        setScreen("unlocked");
        return;
      }
    } catch {
      /* sessionStorage blocked — fall through to fetch */
    }
    fetch("/api/account/pin")
      .then((r) => r.json())
      .then((data: { hasPin?: boolean }) => {
        setScreen(data.hasPin ? "locked" : "unlocked");
      })
      .catch(() => {
        // API unreachable — fail open. Better UX than accidentally
        // locking everyone out when the API hiccups.
        setScreen("unlocked");
      });
  }, []);

  const markUnlocked = useCallback(() => {
    try {
      sessionStorage.setItem(UNLOCK_KEY, "true");
    } catch {
      /* session storage blocked — next page load will re-prompt */
    }
    setScreen("unlocking");
    setTimeout(() => setScreen("unlocked"), 700);
  }, []);

  // Auto-verify when 4 digits are in.
  useEffect(() => {
    if (screen !== "locked" || pin.length < 4) return;
    const submitted = pin;
    fetch("/api/account/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", pin: submitted }),
    })
      .then((r) => r.json())
      .then((data: { valid?: boolean }) => {
        if (data.valid) {
          markUnlocked();
        } else {
          setScreen("wrong");
          setTimeout(() => {
            setScreen("locked");
            setPin("");
          }, 480);
        }
      })
      .catch(() => {
        setScreen("wrong");
        setTimeout(() => {
          setScreen("locked");
          setPin("");
        }, 480);
      });
  }, [pin, screen, markUnlocked]);

  async function sendResetEmail() {
    setSending(true);
    try {
      const res = await fetch("/api/account/pin/reset-request", {
        method: "POST",
      });
      if (res.ok) setScreen("forgot-sent");
      else setScreen("forgot-error");
    } catch {
      setScreen("forgot-error");
    } finally {
      setSending(false);
    }
  }

  if (screen === "checking") {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-cream" aria-hidden="true" />
        {children}
      </>
    );
  }
  if (screen === "unlocked") return <>{children}</>;

  const isWrong = screen === "wrong";
  const isUnlocking = screen === "unlocking";

  return (
    <>
      {screen === "forgot-confirm" ||
      screen === "forgot-sent" ||
      screen === "forgot-error" ? (
        <ForgotModal
          screen={screen}
          sending={sending}
          onSend={sendResetEmail}
          onCancel={() => setScreen("locked")}
        />
      ) : (
        <LockScreen
          pin={pin}
          setPin={setPin}
          isWrong={isWrong}
          isUnlocking={isUnlocking}
          onForgot={() => setScreen("forgot-confirm")}
        />
      )}
      {children}
    </>
  );
}

function LockScreen({
  pin,
  setPin,
  isWrong,
  isUnlocking,
  onForgot,
}: {
  pin: string;
  setPin: (next: string | ((prev: string) => string)) => void;
  isWrong: boolean;
  isUnlocking: boolean;
  onForgot: () => void;
}) {
  const lockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        setPin((p) => (p.length < 4 ? p + e.key : p));
      } else if (e.key === "Backspace") {
        setPin((p) => p.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPin]);

  function handlePad(key: string) {
    if (key === "del") {
      setPin((p) => p.slice(0, -1));
    } else if (pin.length < 4) {
      setPin((p) => p + key);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center pt-[12vh] bg-cream ${
        isUnlocking ? "pin-fadeout" : ""
      }`}
    >
      <div className="relative mb-8 opacity-30">
        <LogoSvg variant="dark" width={80} height={16} />
      </div>

      <div
        ref={lockRef}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isUnlocking ? "pin-lock-glow" : "pin-lock-idle"
        }`}
        style={{
          background: isUnlocking ? "#fef0da" : "#fdf3e9",
          border: "1.5px solid rgba(201,168,76,0.2)",
        }}
      >
        <svg viewBox="0 0 40 44" width="36" height="36" fill="none">
          <path
            d="M12 20 V13 C12 7, 28 7, 28 13 V20"
            stroke="#c9a84c"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <rect x="8" y="20" width="24" height="18" rx="4" fill="#c9a84c" />
          <circle cx="20" cy="29" r="2.5" fill="#fdf3e9" />
        </svg>
      </div>

      <h1 className="text-[20px] font-extrabold text-navy tracking-[-0.3px] mb-1">
        Unlock your vault
      </h1>
      <p
        className="text-[11px] text-center max-w-[220px] mb-2"
        style={{ color: "rgba(44,36,32,0.35)" }}
      >
        Enter your 4-digit PIN.
      </p>

      <div
        className={`flex items-center gap-4 mb-10 mt-4 ${
          isWrong ? "pin-shake" : ""
        }`}
      >
        {[0, 1, 2, 3].map((i) => {
          const filled = pin.length > i;
          return (
            <div
              key={i}
              className="w-[11px] h-[11px] rounded-full"
              style={
                isWrong
                  ? {
                      background: "#f87171",
                      border: "1.5px solid #f87171",
                      transform: "scale(1.2)",
                    }
                  : filled
                    ? {
                        background: "#c9a84c",
                        border: "1.5px solid #c9a84c",
                        transform: "scale(1.2)",
                        boxShadow: "0 0 8px rgba(201,168,76,0.4)",
                      }
                    : {
                        background: "transparent",
                        border: "1.5px solid rgba(201,168,76,0.28)",
                      }
              }
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] px-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
          (key) => {
            if (key === "") return <div key="empty" />;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePad(key)}
                className="aspect-square rounded-full flex items-center justify-center active:scale-[0.89] active:text-amber select-none"
                style={{
                  fontSize: 26,
                  fontWeight: 300,
                  color: "rgba(44,36,32,0.65)",
                  background: "rgba(255,255,255,0.6)",
                  border: "1.5px solid rgba(196,122,58,0.25)",
                }}
              >
                {key === "del" ? "⌫" : key}
              </button>
            );
          },
        )}
      </div>

      <button
        type="button"
        onClick={onForgot}
        className="text-[11px] font-medium mt-6 hover:text-amber"
        style={{ color: "rgba(44,36,32,0.3)" }}
      >
        Forgot PIN?
      </button>
    </div>
  );
}

function ForgotModal({
  screen,
  sending,
  onSend,
  onCancel,
}: {
  screen: "forgot-confirm" | "forgot-sent" | "forgot-error";
  sending: boolean;
  onSend: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-cream p-6">
      <div className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.25)] w-full max-w-[360px] p-6 text-center">
        {screen === "forgot-confirm" && (
          <>
            <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px] mb-2">
              Reset your PIN?
            </h2>
            <p className="text-sm text-ink-mid leading-[1.5] mb-5">
              We&rsquo;ll email you a link to clear your PIN. You can set a
              new one from your account settings after.
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onSend}
                disabled={sending}
                className="w-full bg-amber text-white py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send reset link"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2.5 text-sm font-medium text-ink-mid hover:text-navy"
              >
                Cancel
              </button>
            </div>
          </>
        )}
        {screen === "forgot-sent" && (
          <>
            <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px] mb-2">
              Check your email.
            </h2>
            <p className="text-sm text-ink-mid leading-[1.5] mb-5">
              We sent a reset link to the email on your account. It works
              once and expires in an hour.
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 text-sm font-medium text-ink-mid hover:text-navy"
            >
              Back to lock screen
            </button>
          </>
        )}
        {screen === "forgot-error" && (
          <>
            <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px] mb-2">
              Couldn&rsquo;t send the link.
            </h2>
            <p className="text-sm text-ink-mid leading-[1.5] mb-5">
              Something went wrong on our end. Try again in a minute, or
              email hello@untilthenapp.io.
            </p>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2.5 text-sm font-medium text-ink-mid hover:text-navy"
            >
              Back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
