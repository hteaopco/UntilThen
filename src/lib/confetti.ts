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

  // First burst — bottom right, arcing up
  confetti({
    particleCount: 80,
    angle: 90,
    spread: 100,
    origin: { x: 0.8, y: 0.8 },
    colors: COLORS,
    gravity: 0.8,
    scalar: 1.2,
    ticks: 300,
    startVelocity: 55,
    shapes: ["circle", "square"],
  });

  // Second burst — slightly offset, delayed
  setTimeout(() => {
    confetti({
      particleCount: 60,
      angle: 100,
      spread: 70,
      origin: { x: 0.75, y: 0.85 },
      colors: COLORS,
      gravity: 0.9,
      scalar: 1,
      ticks: 280,
      startVelocity: 50,
      shapes: ["circle"],
    });
  }, 350);
}
