"use client";

import { CalendarCheck, Gift, Sparkles, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { CapsuleCreationFlow } from "./CapsuleCreationFlow";

/**
 * /capsules/new has two phases:
 *   1. Intro — single gift-capsule product card mirroring the
 *      landing-page ChooseYourVault card (same art, same copy,
 *      same bullets) with a "Create Gift Capsule" CTA.
 *   2. Wizard — the original CapsuleCreationFlow (5 steps).
 *
 * Splitting the phase into client state keeps the URL stable
 * (/capsules/new) and lets visitors from the dashboard's Gift
 * Capsules chip see the pitch before committing to the form.
 */
export function CapsuleIntroGate() {
  const [phase, setPhase] = useState<"intro" | "flow">("intro");

  if (phase === "flow") {
    return <CapsuleCreationFlow />;
  }

  return (
    <main className="min-h-screen bg-cream flex items-start justify-center pb-16">
      <div className="mx-auto w-full max-w-[560px] px-6 pt-10 sm:pt-14">
        <div
          className="rounded-[20px] border-[1.5px] overflow-hidden"
          style={{
            background: "#f0f4fa",
            borderColor: "rgba(15,31,61,0.1)",
            boxShadow: "0 4px 24px rgba(15,31,61,0.06)",
          }}
        >
          <div className="p-7 lg:p-8 flex flex-col">
            <div className="mb-6 -mx-1 select-none pointer-events-none">
              <Image
                src="/create%20gift.png"
                alt=""
                width={498}
                height={328}
                priority={false}
                className="w-full h-auto"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-navy mb-2">
              <Gift size={14} strokeWidth={1.75} />
              Gift Capsule
            </div>
            <h1 className="text-[22px] sm:text-[26px] font-extrabold text-navy tracking-[-0.5px] leading-[1.25]">
              Collect messages. Create a gift.
            </h1>
            <p className="text-[15px] text-ink-mid leading-[1.6] mt-1">
              Invite others to add letters, voice notes, photos, and videos.
              Perfect for birthdays, teachers, coaches, anniversaries,
              retirements, and special celebrations.
            </p>
            <ul className="space-y-2 mt-3">
              <Bullet icon={Users}>
                Invite friends &amp; family to contribute
              </Bullet>
              <Bullet icon={CalendarCheck}>
                Perfect for any special moment
              </Bullet>
              <Bullet icon={Sparkles}>
                One gift, many voices
              </Bullet>
            </ul>
            <div className="mt-auto pt-5">
              <button
                type="button"
                onClick={() => setPhase("flow")}
                className="block w-full text-center bg-navy text-white font-bold text-[16px] py-3.5 px-6 rounded-[10px] transition-colors hover:bg-navy-mid"
              >
                Create Gift Capsule
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Bullet({
  icon: Icon,
  children,
}: {
  icon: typeof Gift;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] text-ink-mid leading-[1.5]">
      <Icon
        size={16}
        strokeWidth={1.75}
        className="text-navy shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}
