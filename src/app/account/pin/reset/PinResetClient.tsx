"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

type State = "checking" | "success" | "error";

export function PinResetClient({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string>("");
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (!token) {
      setState("error");
      setMessage("Missing token.");
      return;
    }
    fetch("/api/account/pin/reset-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok && data.success) {
          setState("success");
          // Give the user a beat to read the success message,
          // then drop them on account settings to set a new PIN.
          setTimeout(() => router.push("/account"), 1800);
        } else {
          setState("error");
          setMessage(data.error ?? "This link is no longer valid.");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Couldn't reach the server.");
      });
  }, [token, router]);

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12">
      <Link href="/" aria-label="untilThen home" className="mb-10">
        <LogoSvg variant="dark" width={140} height={28} />
      </Link>

      <div className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.12)] w-full max-w-[420px] p-7 text-center">
        {state === "checking" ? (
          <>
            <h1 className="text-[20px] font-extrabold text-navy tracking-[-0.3px] mb-2">
              Checking your link…
            </h1>
            <p className="text-sm text-ink-mid leading-[1.55]">One moment.</p>
          </>
        ) : state === "success" ? (
          <>
            <h1 className="text-[20px] font-extrabold text-navy tracking-[-0.3px] mb-2">
              PIN cleared.
            </h1>
            <p className="text-sm text-ink-mid leading-[1.55] mb-5">
              Your vault is unlocked again. Taking you to account settings so
              you can set a fresh PIN if you&rsquo;d like.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[20px] font-extrabold text-navy tracking-[-0.3px] mb-2">
              This link can&rsquo;t be used.
            </h1>
            <p className="text-sm text-ink-mid leading-[1.55] mb-5">
              {message}
            </p>
            <Link
              href="/account"
              className="inline-block bg-navy text-white rounded-md px-4 py-2.5 text-[13px] font-bold hover:bg-navy/90"
            >
              Go to account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
