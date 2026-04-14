import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

// Edge runtime keeps the bundle small and the image route isolated
// from the Prisma / Clerk Node paths. ImageResponse sets
// Content-Type: image/png automatically.
export const runtime = "edge";

export async function GET(req: NextRequest) {
  // Photo lives in /public so it's reachable at origin/og-photo.jpg
  // on whatever deploy the request lands on (Railway preview or
  // production) — no hardcoded domain needed.
  const origin = new URL(req.url).origin;
  const photoUrl = `${origin}/og-photo.jpg`;

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
        {/* Full-bleed photo backdrop. object-fit: cover crops the
            portrait source into the 1200×630 landscape frame. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
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

        {/* Dark navy gradient from the bottom so the copy stays
            readable no matter what the photo looks like. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to top, rgba(15,31,61,0.85) 0%, rgba(15,31,61,0.4) 60%, rgba(15,31,61,0) 100%)",
          }}
        />

        {/* Content stack — anchored to the bottom-left corner. */}
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

          {/* Headline — two lines, white, tight leading */}
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

          {/* URL in amber */}
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
    {
      width: 1200,
      height: 630,
    },
  );
}
