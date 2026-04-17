"use client";

import { Delete } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

// TODO: replace with API verification
const DEMO_PIN = "1234";

type State = "checking" | "locked" | "wrong" | "unlocking" | "unlocked";

export function VaultPinScreen() {
  const [state, setState] = useState<State>("checking");
  const [pin, setPin] = useState("");
  const lockRef = useRef<HTMLDivElement>(null);
  const [ripplePos, setRipplePos] = useState({ x: "50%", y: "40%" });

  useEffect(() => {
    if (sessionStorage.getItem("vaultUnlocked") === "true") {
      setState("unlocked");
    } else {
      setState("locked");
    }
  }, []);

  useEffect(() => {
    if (pin.length < 4) return;

    if (pin === DEMO_PIN) {
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
    } else {
      setState("wrong");
      setTimeout(() => {
        setState("locked");
        setPin("");
      }, 480);
    }
  }, [pin]);

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
  if (state === "unlocked") return null;

  const isUnlocking = state === "unlocking";
  const isWrong = state === "wrong";

  return (
    <div
      className={`fixed inset-0 z-[60] flex flex-col items-center pt-[12vh] ${isUnlocking ? "pin-fadeout" : ""}`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, rgba(201,168,76,0.07) 0%, #fdf8f2 70%)",
      }}
    >
      {isUnlocking && (
        <div
          className="pin-ripple"
          style={{ left: ripplePos.x, top: ripplePos.y }}
        />
      )}

      <div className="mb-8 opacity-30">
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

      <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] px-4">
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
                className="aspect-square rounded-full flex items-center justify-center transition-all duration-100 active:scale-[0.89] active:border-amber active:text-amber disabled:opacity-40 select-none"
                style={{
                  fontSize: isDel ? undefined : 22,
                  fontWeight: 300,
                  color: "rgba(44,36,32,0.65)",
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid rgba(201,168,76,0.12)",
                }}
              >
                {isDel ? (
                  <Delete size={20} strokeWidth={1.5} aria-label="Delete" />
                ) : (
                  key
                )}
              </button>
            );
          },
        )}
      </div>

      <button
        type="button"
        className="mt-6 text-[11px] font-medium transition-colors hover:text-amber"
        style={{ color: "rgba(44,36,32,0.3)" }}
      >
        Forgot PIN?
      </button>

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
