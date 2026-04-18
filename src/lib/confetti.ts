// Warm, premium celebration effects for capsule reveals.
// Client-only: dynamically imports canvas-confetti.

const COLORS = ["#c47a3a", "#c9a84c", "#e2c47a", "#fdf8f2", "#e09a5a"];

export async function triggerCelebration() {
  if (typeof window === "undefined") return;
  const { default: confetti } = await import("canvas-confetti");
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { x: 0.5, y: 0.3 },
    colors: COLORS,
    gravity: 0.6,
    scalar: 0.9,
    drift: 0,
    ticks: 250,
    startVelocity: 30,
  });
}

export async function triggerFireworks() {
  if (typeof window === "undefined") return;
  const { default: confetti } = await import("canvas-confetti");

  confetti({
    particleCount: 50,
    angle: 120,
    spread: 60,
    origin: { x: 0.85, y: 0.95 },
    colors: COLORS,
    gravity: 1,
    scalar: 1.1,
    ticks: 280,
    startVelocity: 50,
  });

  setTimeout(() => {
    confetti({
      particleCount: 40,
      angle: 110,
      spread: 50,
      origin: { x: 0.8, y: 0.95 },
      colors: COLORS,
      gravity: 1,
      scalar: 1,
      ticks: 250,
      startVelocity: 45,
    });
  }, 300);
}
