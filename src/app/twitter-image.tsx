// Twitter card uses the same visual as the OG card. We import the
// render function and re-declare the metadata exports directly so
// Next.js's metadata scanner can statically analyse them — it
// doesn't follow `export { runtime } from ...` re-exports and
// falls back to defaults otherwise.

import OpengraphImage from "./opengraph-image";

export const runtime = "nodejs";
export const alt =
  "untilThen — Moments from the past, opened in the future.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OpengraphImage;
