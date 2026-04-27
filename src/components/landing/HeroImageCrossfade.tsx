"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/landing-wedding-polaroid.png",
  "/landing-school-polaroid.png",
  "/landing-football-polaroid.png",
];

export function HeroImageCrossfade() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative mx-auto overflow-hidden w-[92vw] lg:w-full max-w-[640px]"
      style={{
        background: "#fdf8f2",
      }}
    >
      <div
        className="relative aspect-[3/2]"
        style={{ transform: "scale(1.14)" }}
      >
        {IMAGES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0"
            style={{
              opacity: i === active ? 1 : 0,
              transition: "opacity 500ms ease-in-out",
              WebkitMaskImage: [
                "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 10%, black 20%, black 80%, rgba(0,0,0,0.4) 92%, transparent 100%)",
                "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 6%, black 14%, black 86%, rgba(0,0,0,0.4) 94%, transparent 100%)",
              ].join(", "),
              WebkitMaskComposite: "source-in",
              maskImage: [
                "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.4) 10%, black 20%, black 80%, rgba(0,0,0,0.4) 92%, transparent 100%)",
                "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 6%, black 14%, black 86%, rgba(0,0,0,0.4) 94%, transparent 100%)",
              ].join(", "),
              maskComposite: "intersect" as React.CSSProperties["maskComposite"],
            }}
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="(max-width: 768px) 92vw, 640px"
              className="object-contain"
              priority={i === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
