"use client";

import { Delete, Fingerprint } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

// TODO: replace with API verification
const DEMO_PIN = "1234";
const BIOMETRIC_CRED_KEY = "untilthen:biometric-cred";

type State = "checking" | "locked" | "wrong" | "unlocking" | "unlocked";

async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (
      typeof window === "undefined" ||
      !window.PublicKeyCredential ||
      !PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
    )
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
        user: {
          id: randomBytes(16),
          name: "vault-user",
          displayName: "Vault User",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return null;
    const id = credential.id;
    localStorage.setItem(BIOMETRIC_CRED_KEY, id);
    return id;
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
  const [state, setState] = useState<State>("checking");
  const [pin, setPin] = useState("");
  const lockRef = useRef<HTMLDivElement>(null);
  const [ripplePos, setRipplePos] = useState({ x: "50%", y: "40%" });
  const [biometricReady, setBiometricReady] = useState(false);
  const [hasBiometricCred, setHasBiometricCred] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("vaultUnlocked") === "true") {
      setState("unlocked");
      return;
    }
    setState("locked");

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
    setState("unlocking");
    setTimeout(() => {
      sessionStorage.setItem("vaultUnlocked", "true");
      setState("unlocked");
    }, 1600);
  }, []);

  useEffect(() => {
    if (pin.length < 4) return;

    if (pin === DEMO_PIN) {
      triggerUnlock();
      if (biometricReady && !hasBiometricCred) {
        setTimeout(() => setShowBiometricPrompt(true), 1800);
      }
    } else {
      setState("wrong");
      setTimeout(() => {
        setState("locked");
        setPin("");
      }, 480);
    }
  }, [pin, triggerUnlock, biometricReady, hasBiometricCred]);

  async function handleBiometricUnlock() {
    const ok = await verifyBiometric();
    if (ok) {
      triggerUnlock();
    }
  }

  async function enableBiometric() {
    const id = await registerBiometric();
    if (id) {
      setHasBiometricCred(true);
    }
    setShowBiometricPrompt(false);
  }

  function addDigit(d: string) {
    if (state !== "locked" || pin.length >= 4) return;
    setPin((p) => p + d);
  }

  function deleteDigit() {
    if (state !== "locked") return;
    setPin((p) => p.slice(0, -1));
  }

  if (state === "checking") {
    return <div className="fixed inset-0 z-[60] bg-cream" />;
  }
  if (state === "unlocked") {
    if (showBiometricPrompt) {
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
              <button
                type="button"
                onClick={enableBiometric}
                className="w-full bg-amber text-white py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
              >
                Enable Face ID
              </button>
              <button
                type="button"
                onClick={() => setShowBiometricPrompt(false)}
                className="w-full py-2.5 text-sm font-medium text-ink-mid hover:text-navy transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  const isUnlocking = state === "unlocking";
  const isWrong = state === "wrong";

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center pt-[12vh] bg-cream ${isUnlocking ? "pin-fadeout" : ""}`}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 70%)",
        }}
      />

      {isUnlocking && (
        <div
          className="pin-ripple"
          style={{ left: ripplePos.x, top: ripplePos.y }}
        />
      )}

      <div className="relative mb-8 opacity-30">
        <LogoSvg variant="dark" width={80} height={16} />
      </div>

      <div
        ref={lockRef}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-200 ${
          isUnlocking ? "pin-lock-glow" : "pin-lock-idle"
        }`}
        style={{
          background: isUnlocking ? "#fef0da" : "#fdf3e9",
          border: "1.5px solid rgba(201,168,76,0.2)",
        }}
      >
        <svg viewBox="0 0 40 44" width="36" height="36" fill="none">
          <path
            className={isUnlocking ? "pin-shackle-lift" : ""}
            d="M12 20 V13 C12 7, 28 7, 28 13 V20"
            stroke="#c9a84c"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            style={{ transformOrigin: "28px 20px" }}
          />
          <rect x="8" y="20" width="24" height="18" rx="4" fill="#c9a84c" />
          <circle cx="20" cy="29" r="2.5" fill="#fdf3e9" />
        </svg>
      </div>

      <h1 className="text-[20px] font-extrabold text-navy tracking-[-0.3px] mb-1">
        Unlock your vault
      </h1>
      <p
        className="text-[11px] text-center max-w-[200px] mb-8"
        style={{ color: "rgba(44,36,32,0.35)" }}
      >
        A simple 4-digit code keeps your memories private.
      </p>

      <div className={`flex items-center gap-4 mb-10 ${isWrong ? "pin-shake" : ""}`}>
        {[0, 1, 2, 3].map((i) => {
          const filled = pin.length > i;
          return (
            <div
              key={i}
              className="w-[11px] h-[11px] rounded-full transition-all duration-150"
              style={
                isWrong
                  ? { background: "#f87171", border: "1.5px solid #f87171", transform: "scale(1.2)" }
                  : filled
                    ? {
                        background: "#c9a84c",
                        border: "1.5px solid #c9a84c",
                        transform: "scale(1.2)",
                        boxShadow: "0 0 8px rgba(201,168,76,0.4)",
                      }
                    : { background: "transparent", border: "1.5px solid rgba(201,168,76,0.28)" }
              }
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] px-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
          (key) => {
            if (key === "") return <div key="empty" />;
            const isDel = key === "del";
            return (
              <button
                key={key}
                type="button"
                onClick={() => (isDel ? deleteDigit() : addDigit(key))}
                disabled={state !== "locked"}
                className="aspect-square rounded-full flex items-center justify-center transition-all duration-100 active:scale-[0.89] active:text-amber disabled:opacity-40 select-none"
                style={{
                  fontSize: isDel ? undefined : 26,
                  fontWeight: 300,
                  color: "rgba(44,36,32,0.65)",
                  background: "rgba(255,255,255,0.6)",
                  border: "1.5px solid rgba(196,122,58,0.25)",
                }}
              >
                {isDel ? (
                  <Delete size={22} strokeWidth={1.5} aria-label="Delete" />
                ) : (
                  key
                )}
              </button>
            );
          },
        )}
      </div>

      <div className="flex items-center gap-4 mt-6">
        {hasBiometricCred && (
          <button
            type="button"
            onClick={handleBiometricUnlock}
            disabled={state !== "locked"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber/30 text-amber text-[13px] font-semibold hover:bg-amber-tint transition-colors disabled:opacity-40"
          >
            <Fingerprint size={18} strokeWidth={1.5} />
            Use Face ID
          </button>
        )}
        <button
          type="button"
          className="text-[11px] font-medium transition-colors hover:text-amber"
          style={{ color: "rgba(44,36,32,0.3)" }}
        >
          Forgot PIN?
        </button>
      </div>

      {isUnlocking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none pin-transition-text">
          <p className="text-[18px] italic text-navy/60 font-medium">
            Opening your vault&hellip;
          </p>
        </div>
      )}
    </div>
  );
}
