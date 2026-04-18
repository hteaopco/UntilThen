// Warm, premium celebration effects for capsule reveals.
// Client-only: dynamically imports canvas-confetti.

const COLORS = ["#c47a3a", "#c9a84c", "#e2c47a", "#fdf8f2", "#e09a5a"];

export async function triggerCelebration() {
  if (typeof window === "undefined") return;
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.4 },
    colors: COLORS,
    gravity: 0.8,
    scalar: 0.9,
    drift: 0.1,
    ticks: 200,
  });
}

export async function triggerFireworks() {
  if (typeof window === "undefined") return;
  const { default: confetti } = await import("canvas-confetti");

  // Bottom-left burst
  confetti({
    particleCount: 40,
    angle: 60,
    spread: 55,
    origin: { x: 0.2, y: 1 },
    colors: COLORS,
    gravity: 1.2,
    scalar: 1.1,
    ticks: 250,
    startVelocity: 45,
  });

  // Bottom-right burst
  confetti({
    particleCount: 40,
    angle: 120,
    spread: 55,
    origin: { x: 0.8, y: 1 },
    colors: COLORS,
    gravity: 1.2,
    scalar: 1.1,
    ticks: 250,
    startVelocity: 45,
  });

  // Center burst upward
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 90,
      spread: 80,
      origin: { x: 0.5, y: 1 },
      colors: COLORS,
      gravity: 1,
      scalar: 1,
      ticks: 300,
      startVelocity: 50,
    });
  }, 200);
}
