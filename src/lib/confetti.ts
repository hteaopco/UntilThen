// Warm, gentle confetti for the capsule open / preview transitions.
// The brief calls out that this should feel premium and still — not
// a party-popper explosion — so the params here stay conservative
// (60 particles, slow drift, muted palette).
//
// Client-only: dynamically imports canvas-confetti so the module
// isn't bundled into server components.

export async function triggerCelebration() {
  if (typeof window === "undefined") return;
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.4 },
    colors: ["#c47a3a", "#c9a84c", "#fdf8f2", "#0f1f3d"],
    gravity: 0.8,
    scalar: 0.9,
    drift: 0.1,
    ticks: 200,
  });
}
