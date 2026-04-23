"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

type Step = "enter" | "confirm" | "saving" | "saved";

export function PinSetupClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("enter");
  const [firstPin, setFirstPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const active = step === "confirm" ? confirmPin : firstPin;
  const setActive = step === "confirm" ? setConfirmPin : setFirstPin;

  // Keyboard input support.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (step === "saving" || step === "saved") return;
      if (e.key >= "0" && e.key <= "9") {
        setActive((p) => (p.length < 4 ? p + e.key : p));
      } else if (e.key === "Backspace") {
        setActive((p) => p.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setActive]);

  // Step advance: enter → confirm once first PIN is 4 digits.
  useEffect(() => {
    if (step === "enter" && firstPin.length === 4) {
      const t = setTimeout(() => {
        setStep("confirm");
        setError(null);
      }, 160);
      return () => clearTimeout(t);
    }
  }, [firstPin, step]);

  // Confirm → save (or fail and reset).
  useEffect(() => {
    if (step !== "confirm" || confirmPin.length < 4) return;
    if (confirmPin !== firstPin) {
      setError("PINs don't match. Start over.");
      setTimeout(() => {
        setFirstPin("");
        setConfirmPin("");
        setStep("enter");
        setError(null);
      }, 1400);
      return;
    }
    setStep("saving");
    fetch("/api/account/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup", pin: confirmPin }),
    })
      .then((r) => r.json())
      .then((data: { success?: boolean; error?: string }) => {
        if (data.success) {
          setStep("saved");
          setTimeout(() => router.push("/account"), 1100);
        } else {
          setError(data.error ?? "Couldn't save PIN.");
          setFirstPin("");
          setConfirmPin("");
          setStep("enter");
        }
      })
      .catch(() => {
        setError("Couldn't reach the server.");
        setFirstPin("");
        setConfirmPin("");
        setStep("enter");
      });
  }, [confirmPin, firstPin, step, router]);

  function pad(key: string) {
    if (step === "saving" || step === "saved") return;
    if (key === "del") {
      setActive((p) => p.slice(0, -1));
    } else if (active.length < 4) {
      setActive((p) => p + key);
    }
  }

  const heading =
    step === "enter"
      ? "Create your PIN"
      : step === "confirm"
        ? "Confirm your PIN"
        : step === "saving"
          ? "Saving…"
          : "You're set.";
  const subtitle =
    step === "enter"
      ? "Choose a 4-digit code to protect your vault."
      : step === "confirm"
        ? "Enter the same 4 digits again."
        : step === "saving"
          ? ""
          : "Your vault is now protected by a PIN.";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center pt-[12vh] bg-cream">
      <div className="relative mb-8 opacity-30">
        <LogoSvg variant="dark" width={80} height={16} />
      </div>
      <div
        className="relative w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          background: "#fdf3e9",
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
        {heading}
      </h1>
      <p
        className="text-[11px] text-center max-w-[240px] mb-2"
        style={{ color: "rgba(44,36,32,0.45)" }}
      >
        {subtitle}
      </p>

      {error ? (
        <p className="text-xs text-red-600 font-semibold mb-2">{error}</p>
      ) : null}

      <div className="flex items-center gap-4 mb-10 mt-4">
        {[0, 1, 2, 3].map((i) => {
          const filled = active.length > i;
          return (
            <div
              key={i}
              className="w-[11px] h-[11px] rounded-full"
              style={
                filled
                  ? {
                      background: "#c9a84c",
                      border: "1.5px solid #c9a84c",
                      transform: "scale(1.2)",
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

      {step !== "saved" && step !== "saving" ? (
        <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] px-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
            (key) => {
              if (key === "") return <div key="empty" />;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pad(key)}
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
      ) : null}

      <button
        type="button"
        onClick={() => router.push("/account")}
        className="text-[11px] font-medium mt-6 hover:text-amber"
        style={{ color: "rgba(44,36,32,0.35)" }}
      >
        Cancel
      </button>
    </div>
  );
}
