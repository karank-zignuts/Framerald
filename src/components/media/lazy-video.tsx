"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
};

/**
 * A muted preview that only starts loading when it is near the screen. A Library page can hold dozens of
 * clips, and each `<video preload="metadata">` would otherwise open its own request the moment the page loads.
 */
export function LazyVideo({ src, poster, className }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = box.current;
    if (!node || near) return;
    if (typeof IntersectionObserver === "undefined") {
      const id = setTimeout(() => setNear(true), 0);
      return () => clearTimeout(id);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [near]);

  return (
    <div ref={box} className={className}>
      {near ? (
        <video src={src} poster={poster} muted playsInline preload="metadata" className="size-full object-cover" />
      ) : poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="size-full object-cover" loading="lazy" />
      ) : null}
    </div>
  );
}
