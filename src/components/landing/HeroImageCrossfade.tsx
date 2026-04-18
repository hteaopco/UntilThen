"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/0A095EDC-513D-42B4-A30D-5DD1EC687353.png",
  "/3E7687A7-F13A-4ADD-A27B-EA5353E853E6.png",
  "/F18178AC-8EBA-4954-9CD8-84ACFFE556E8.png",
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
    <div className="relative w-full max-w-[600px] mx-auto aspect-[3/2]">
      {IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0"
          style={{
            opacity: i === active ? 1 : 0,
            transition: "opacity 500ms ease-in-out",
          }}
        >
          <Image
            src={src}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 600px"
            className="object-contain mix-blend-multiply"
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  );
}
