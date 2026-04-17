"use client";

import { Delete, Fingerprint } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

const BIOMETRIC_CRED_KEY = "untilthen:biometric-cred";

type Screen = "checking" | "setup" | "confirm" | "locked" | "wrong" | "unlocking" | "unlocked" | "forgot" | "reset";

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !isTouchDevice()) return false;
    if (!window.PublicKeyCredential || !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
      return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function randomBytes(n: number): ArrayBuffer {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf.buffer as ArrayBuffer;
}

async function registerBiometric(): Promise<string | null> {
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: "untilThen", id: window.location.hostname },
        user: { id: randomBytes(16), name: "vault-user", displayName: "Vault User" },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return null;
    localStorage.setItem(BIOMETRIC_CRED_KEY, credential.id);
    return credential.id;
  } catch {
    return null;
  }
}

async function verifyBiometric(): Promise<boolean> {
  try {
    const credId = localStorage.getItem(BIOMETRIC_CRED_KEY);
    if (!credId) return false;
    const idBytes = Uint8Array.from(atob(credId.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ id: idBytes, type: "public-key", transports: ["internal"] }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return assertion !== null;
  } catch {
    return false;
  }
}

export function VaultPinScreen() {
  const [screen, setScreen] = useState<Screen>("checking");
  const [pin, setPin] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const [ripplePos, setRipplePos] = useState({ x: "50%", y: "40%" });
  const [biometricReady, setBiometricReady] = useState(false);
  const [hasBiometricCred, setHasBiometricCred] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("vaultUnlocked") === "true") {
      setScreen("unlocked");
      return;
    }

    fetch("/api/account/pin")
      .then((r) => r.json())
      .then((data: { hasPin?: boolean }) => {
        setScreen(data.hasPin ? "locked" : "setup");
      })
      .catch(() => setScreen("locked"));

    isBiometricAvailable().then((avail) => {
      setBiometricReady(avail);
      if (avail && localStorage.getItem(BIOMETRIC_CRED_KEY)) {
        setHasBiometricCred(true);
      }
    });
  }, []);

  const triggerUnlock = useCallback(() => {
    if (lockRef.current) {
      const rect = lockRef.current.getBoundingClientRect();
      setRipplePos({
        x: `${rect.left + rect.width / 2}px`,
        y: `${rect.top + rect.height / 2}px`,
      });
    }
    setScreen("unlocking");
    setTimeout(() => {
      sessionStorage.setItem("vaultUnlocked", "true");
      setScreen("unlocked");
    }, 1600);
  }, []);

  // Keyboard support
  useEffect(() => {
    if (screen !== "locked" && screen !== "setup" && screen !== "confirm") return;
    function onKey(e: KeyboardEvent) {
      if (e.key >= "0" && e.key <= "9") {
        if (screen === "setup" || screen === "confirm") {
          handleSetupDigit(e.key);
        } else {
          addDigit(e.key);
        }
      } else if (e.key === "Backspace") {
        if (screen === "setup" || screen === "confirm") {
          setSetupPin((p) => p.slice(0, -1));
        } else {
          deleteDigit();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, setupPin, pin]);

  // Verify PIN when 4 digits entered
  useEffect(() => {
    if (screen !== "locked" || pin.length < 4) return;

    fetch("/api/account/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", pin }),
    })
      .then((r) => r.json())
      .then((data: { valid?: boolean }) => {
        if (data.valid) {
          triggerUnlock();
          if (biometricReady && !hasBiometricCred) {
            setTimeout(() => setShowBiometricPrompt(true), 1800);
          }
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
  }, [pin, screen, triggerUnlock, biometricReady, hasBiometricCred]);

  function handleSetupDigit(d: string) {
    if (screen === "setup") {
      if (setupPin.length < 4) setSetupPin((p) => p + d);
    } else if (screen === "confirm") {
      if (pin.length < 4) setPin((p) => p + d);
    }
  }

  // Setup: first entry done → move to confirm
  useEffect(() => {
    if (screen === "setup" && setupPin.length === 4) {
      setTimeout(() => {
        setScreen("confirm");
        setPin("");
        setError(null);
      }, 200);
    }
  }, [setupPin, screen]);

  // Confirm: check match
  useEffect(() => {
    if (screen !== "confirm" || pin.length < 4) return;

    if (pin === setupPin) {
      fetch("/api/account/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", pin }),
      })
        .then((r) => r.json())
        .then((data: { success?: boolean; error?: string }) => {
          if (data.success) {
            triggerUnlock();
          } else {
            setError(data.error ?? "Couldn't save PIN.");
            setPin("");
          }
        })
        .catch(() => {
          setError("Something went wrong.");
          setPin("");
        });
    } else {
      setError("PINs don\u2019t match. Try again.");
      setPin("");
      setTimeout(() => setError(null), 2000);
    }
  }, [pin, setupPin, screen, triggerUnlock]);

  async function handleForgotPin() {
    setScreen("forgot");
  }

  async function resetPin() {
    setError(null);
    try {
      const res = await fetch("/api/account/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = (await res.json()) as { success?: boolean };
      if (data.success) {
        setSetupPin("");
        setPin("");
        setScreen("setup");
      }
    } catch {
      setError("Couldn't reset PIN.");
    }
  }

  async function handleBiometricUnlock() {
    const ok = await verifyBiometric();
    if (ok) triggerUnlock();
  }

  async function enableBiometric() {
    await registerBiometric();
    setHasBiometricCred(true);
    setShowBiometricPrompt(false);
  }

  function addDigit(d: string) {
    if (screen !== "locked" || pin.length >= 4) return;
    setPin((p) => p + d);
  }

  function deleteDigit() {
    if (screen !== "locked") return;
    setPin((p) => p.slice(0, -1));
  }

  if (screen === "checking") {
    return <div className="fixed inset-0 z-[60] bg-cream" />;
  }

  if (screen === "unlocked") {
    if (showBiometricPrompt && biometricReady) {
      return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-cream">
          <div className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.25)] w-full max-w-[360px] p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-tint text-amber flex items-center justify-center mx-auto mb-4">
              <Fingerprint size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px] mb-1">
              Enable Face ID?
            </h2>
            <p className="text-sm text-ink-mid leading-[1.5] mb-5">
              Unlock your vault faster next time with biometrics.
            </p>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={enableBiometric}
                className="w-full bg-amber text-white py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors">
                Enable Face ID
              </button>
              <button type="button" onClick={() => setShowBiometricPrompt(false)}
                className="w-full py-2.5 text-sm font-medium text-ink-mid hover:text-navy transition-colors">
                Not now
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (screen === "forgot") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-cream p-6">
        <div className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.25)] w-full max-w-[360px] p-6 text-center">
          <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px] mb-2">
            Reset your PIN?
          </h2>
          <p className="text-sm text-ink-mid leading-[1.5] mb-5">
            This will clear your current PIN and let you set a new one.
          </p>
          {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
          <div className="flex flex-col gap-2">
            <button type="button" onClick={resetPin}
              className="w-full bg-amber text-white py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors">
              Reset PIN
            </button>
            <button type="button" onClick={() => { setScreen("locked"); setError(null); }}
              className="w-full py-2.5 text-sm font-medium text-ink-mid hover:text-navy transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSetup = screen === "setup";
  const isConfirm = screen === "confirm";
  const isUnlocking = screen === "unlocking";
  const isWrong = screen === "wrong";
  const activePin = isSetup || isConfirm ? (isSetup ? setupPin : pin) : pin;
  const canType = screen === "locked" || isSetup || isConfirm;

  const heading = isSetup
    ? "Create your PIN"
    : isConfirm
      ? "Confirm your PIN"
      : "Unlock your vault";

  const subtitle = isSetup
    ? "Choose a 4-digit code to protect your vault."
    : isConfirm
      ? "Enter the same 4 digits again to confirm."
      : "A simple 4-digit code keeps your memories private.";

  function handlePadPress(key: string) {
    if (!canType) return;
    if (key === "del") {
      if (isSetup) setSetupPin((p) => p.slice(0, -1));
      else setPin((p) => p.slice(0, -1));
    } else {
      if (isSetup) {
        if (setupPin.length < 4) setSetupPin((p) => p + key);
      } else if (isConfirm) {
        if (pin.length < 4) setPin((p) => p + key);
      } else {
        addDigit(key);
      }
    }
  }

  return (
    <div className={`fixed inset-0 z-[60] flex flex-col items-center pt-[12vh] bg-cream ${isUnlocking ? "pin-fadeout" : ""}`}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)" }} />

      {isUnlocking && (
        <div className="pin-ripple" style={{ left: ripplePos.x, top: ripplePos.y }} />
      )}

      <div className="relative mb-8 opacity-30">
        <LogoSvg variant="dark" width={80} height={16} />
      </div>

      <div ref={lockRef}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-200 ${
          isUnlocking ? "pin-lock-glow" : "pin-lock-idle"
        }`}
        style={{ background: isUnlocking ? "#fef0da" : "#fdf3e9", border: "1.5px solid rgba(201,168,76,0.2)" }}>
        <svg viewBox="0 0 40 44" width="36" height="36" fill="none">
          <path className={isUnlocking ? "pin-shackle-lift" : ""}
            d="M12 20 V13 C12 7, 28 7, 28 13 V20"
            stroke="#c9a84c" strokeWidth="3" fill="none" strokeLinecap="round"
            style={{ transformOrigin: "28px 20px" }} />
          <rect x="8" y="20" width="24" height="18" rx="4" fill="#c9a84c" />
          <circle cx="20" cy="29" r="2.5" fill="#fdf3e9" />
        </svg>
      </div>

      <h1 className="text-[20px] font-extrabold text-navy tracking-[-0.3px] mb-1">{heading}</h1>
      <p className="text-[11px] text-center max-w-[220px] mb-2" style={{ color: "rgba(44,36,32,0.35)" }}>
        {subtitle}
      </p>

      {error && (
        <p className="text-xs text-red-600 font-semibold mb-2">{error}</p>
      )}

      <div className={`flex items-center gap-4 mb-10 mt-4 ${isWrong ? "pin-shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => {
          const filled = activePin.length > i;
          return (
            <div key={i} className="w-[11px] h-[11px] rounded-full transition-all duration-150"
              style={
                isWrong
                  ? { background: "#f87171", border: "1.5px solid #f87171", transform: "scale(1.2)" }
                  : filled
                    ? { background: "#c9a84c", border: "1.5px solid #c9a84c", transform: "scale(1.2)", boxShadow: "0 0 8px rgba(201,168,76,0.4)" }
                    : { background: "transparent", border: "1.5px solid rgba(201,168,76,0.28)" }
              } />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] px-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
          if (key === "") return <div key="empty" />;
          const isDel = key === "del";
          return (
            <button key={key} type="button"
              onClick={() => handlePadPress(key)}
              disabled={!canType}
              className="aspect-square rounded-full flex items-center justify-center transition-all duration-100 active:scale-[0.89] active:text-amber disabled:opacity-40 select-none"
              style={{
                fontSize: isDel ? undefined : 26, fontWeight: 300,
                color: "rgba(44,36,32,0.65)", background: "rgba(255,255,255,0.6)",
                border: "1.5px solid rgba(196,122,58,0.25)",
              }}>
              {isDel ? <Delete size={22} strokeWidth={1.5} aria-label="Delete" /> : key}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-6">
        {hasBiometricCred && screen === "locked" && (
          <button type="button" onClick={handleBiometricUnlock}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber/30 text-amber text-[13px] font-semibold hover:bg-amber-tint transition-colors">
            <Fingerprint size={18} strokeWidth={1.5} />
            Use Face ID
          </button>
        )}
        {screen === "locked" && (
          <button type="button" onClick={handleForgotPin}
            className="text-[11px] font-medium transition-colors hover:text-amber"
            style={{ color: "rgba(44,36,32,0.3)" }}>
            Forgot PIN?
          </button>
        )}
      </div>

      {isUnlocking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none pin-transition-text">
          <p className="text-[18px] italic text-navy/60 font-medium">Opening your vault&hellip;</p>
        </div>
      )}
    </div>
  );
}
