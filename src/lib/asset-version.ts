import { statSync } from "node:fs";
import { join } from "node:path";

/**
 * Cache-bust query for static assets in /public.
 *
 * Anything served from /public has long browser cache headers,
 * so when an asset (like Card.png) is replaced in the repo the
 * browser keeps showing the cached version until a manual
 * cache-bust query string changes. This helper reads the file's
 * mtime at request time and returns a stable string we append
 * as `?v=…` — that way every upload automatically invalidates
 * the cache without anyone touching code.
 *
 * Server-only (uses node:fs). Pass the result through to client
 * components as a prop.
 *
 * Returns "0" if the file can't be read so the call site never
 * has to wrap this in try/catch.
 */
export function assetVersion(publicPath: string): string {
  try {
    const stat = statSync(join(process.cwd(), "public", publicPath));
    return String(Math.floor(stat.mtimeMs));
  } catch {
    return "0";
  }
}
