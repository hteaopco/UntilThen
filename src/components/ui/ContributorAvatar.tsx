/**
 * ContributorAvatar — circular avatar bubble for a contribution
 * author or any other named person displayed in a list.
 *
 * Renders the author's R2-signed photo when `imageUrl` is set;
 * falls back to amber initials when not. Used by:
 *   - Updates inbox row author
 *   - Capsule contribution lists (pending + live)
 *   - Anywhere else a contributor is shown by name
 *
 * Initials are derived from the first letter of each whitespace-
 * separated word in `name`, capped at 2 characters.
 */
export function ContributorAvatar({
  name,
  imageUrl,
  size = 36,
}: {
  name: string;
  imageUrl?: string | null;
  /** Pixel diameter. 36 (default) suits inline list rows; 48–64
   *  works for hero contributor cards. */
  size?: number;
}) {
  const dim = `${size}px`;
  // Loosely scaled font: 12px@36, 16px@48 — keeps initials readable
  // without dominating the bubble at any size.
  const fontSize = Math.max(11, Math.round(size * 0.36));

  return (
    <span
      aria-hidden="true"
      style={{ width: dim, height: dim, fontSize: `${fontSize}px` }}
      className="shrink-0 inline-flex items-center justify-center rounded-full overflow-hidden bg-amber-tint text-amber font-extrabold tracking-[-0.2px] border border-amber/15"
    >
      {imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </span>
  );
}

function initialsOf(name: string): string {
  const cleaned = (name ?? "").trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return `${first}${second}`.toUpperCase() || "?";
}
