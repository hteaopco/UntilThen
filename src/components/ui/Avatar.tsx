"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

export function Avatar() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking outside the menu/avatar.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() || "?";
  const email = user?.emailAddresses?.[0]?.emailAddress;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        disabled={!isLoaded}
        className="w-9 h-9 rounded-full bg-navy text-white text-[13px] font-bold tracking-[0.02em] flex items-center justify-center hover:opacity-85 transition-opacity focus:outline-none focus:ring-2 focus:ring-amber/40 disabled:opacity-50"
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-11 right-0 min-w-[220px] rounded-xl bg-white border border-navy/[0.08] shadow-[0_4px_24px_rgba(15,31,61,0.12)] overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-navy/[0.06]">
            <div className="text-sm font-bold text-navy">
              {user?.firstName} {user?.lastName}
            </div>
            {email && (
              <div className="text-xs text-ink-light mt-0.5 truncate">
                {email}
              </div>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              signOut({ redirectUrl: "/" });
            }}
            className="w-full text-left px-4 py-3 text-sm font-medium text-ink-mid hover:bg-[#f8fafc] hover:text-navy transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
