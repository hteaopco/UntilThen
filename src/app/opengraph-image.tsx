import fs from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

// Next.js's file-based OG image convention. Placing this at
// src/app/opengraph-image.tsx makes Next auto-emit the correct
// <meta property="og:image"> tag on every page, with the URL
// resolved to the actual request origin automatically.
// See: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image

export const runtime = "nodejs";

export const alt =
  "untilThen — Moments from the past, opened in the future.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // Read the pre-cropped 1200×630 photo from /public at image-
  // generation time. fs works in both the build-time prerender
  // and at runtime in the standalone output (process.cwd() points
  // at the app root in both cases; /public gets copied into the
  // standalone bundle).
  const photoBytes = await fs.readFile(
    path.join(process.cwd(), "public", "og-photo.jpg"),
  );
  const photoSrc = `data:image/jpeg;base64,${photoBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* Full-bleed photo backdrop. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoSrc}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Dark navy gradient from the bottom for copy legibility. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to top, rgba(15,31,61,0.85) 0%, rgba(15,31,61,0.4) 60%, rgba(15,31,61,0) 100%)",
          }}
        />

        {/* Bottom-left content stack. */}
        <div
          style={{
            position: "absolute",
            left: 64,
            right: 64,
            bottom: 60,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          {/* Logo wordmark */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              marginBottom: 26,
            }}
          >
            <span
              style={{
                fontSize: 68,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-2px",
              }}
            >
              until
            </span>
            <span
              style={{
                fontSize: 68,
                fontWeight: 800,
                color: "#c47a3a",
                letterSpacing: "-2px",
              }}
            >
              Then
            </span>
            <span
              style={{
                fontSize: 22,
                color: "#c9a84c",
                marginLeft: "-10px",
                marginBottom: 36,
                lineHeight: 1,
              }}
            >
              ♥
            </span>
          </div>

          {/* Headline — two lines, white */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: 18,
            }}
          >
            <span
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
              }}
            >
              Moments from the past,
            </span>
            <span
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
              }}
            >
              opened in the future.
            </span>
          </div>

          {/* URL */}
          <span
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: "#c47a3a",
              letterSpacing: "0.04em",
            }}
          >
            untilthenapp.io
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
