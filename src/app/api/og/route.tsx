import { ImageResponse } from "next/og";

// @vercel/og + Satori runs in edge / nodejs. Mark as edge so the
// route stays lightweight and the image generation isn't bundled
// with the Prisma + Clerk Node runtime paths.
export const runtime = "edge";
export const contentType = "image/png";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#fdf8f2",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo — "until" navy + "Then" amber, with the gold heart
            sitting where the i-dot would be on the lowercase i. */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            marginBottom: "36px",
          }}
        >
          <span
            style={{
              fontSize: 84,
              fontWeight: 800,
              color: "#0f1f3d",
              letterSpacing: "-2px",
            }}
          >
            until
          </span>
          <span
            style={{
              fontSize: 84,
              fontWeight: 800,
              color: "#c47a3a",
              letterSpacing: "-2px",
            }}
          >
            Then
          </span>
          <span
            style={{
              fontSize: 26,
              color: "#c9a84c",
              marginLeft: "-12px",
              marginBottom: 44,
              lineHeight: 1,
            }}
          >
            ♥
          </span>
        </div>

        {/* Subtle gold rule between logo and headline */}
        <div
          style={{
            width: 48,
            height: 2,
            background: "#c9a84c",
            opacity: 0.5,
            marginBottom: 40,
          }}
        />

        {/* Headline — two centred lines, break after "past," */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#0f1f3d",
              letterSpacing: "-1.5px",
              lineHeight: 1.1,
            }}
          >
            Moments from the past,
          </span>
          <span
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: "#0f1f3d",
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
            fontSize: 26,
            fontWeight: 500,
            color: "#c47a3a",
            letterSpacing: "0.04em",
          }}
        >
          untilthenapp.io
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
