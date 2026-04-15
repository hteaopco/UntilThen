// Shared date formatters. Both forms were previously defined
// separately in 10+ components (dashboard, collection detail,
// preview, child view, etc.). Centralising keeps formatting
// consistent and removes the drift risk when one site tweaks a
// format string without the others.

export function formatShort(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLong(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonthYear(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}
