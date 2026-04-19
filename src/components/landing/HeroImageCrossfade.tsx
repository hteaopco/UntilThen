"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/51AC950C-0D81-4C37-BD6D-DA12891BFE4C.png",
  "/592F39A3-29B8-4863-AAE3-9C929B3B315F.png",
  "/6A94774F-54D1-47DD-800A-9DDF6C3C22D9.png",
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
    <div className="relative w-full max-w-[680px] mx-auto aspect-[3/2]">
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
            className="object-contain"
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  );
}
