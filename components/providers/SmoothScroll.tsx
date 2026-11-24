"use client";

import { useEffect } from "react";
import { setLenis } from "@/lib/motion/lenis";

/** Mounts a root Lenis instance unless the user prefers reduced motion. Renders nothing. */
export function SmoothScroll() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let destroy: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      if (media.matches) return;
      const { default: Lenis } = await import("lenis");
      if (cancelled) return;
      const lenis = new Lenis({ lerp: 0.1, autoRaf: true, anchors: { offset: -88 } });
      setLenis(lenis);
      destroy = () => {
        lenis.destroy();
        setLenis(null);
      };
    };

    const onChange = () => {
      destroy?.();
      destroy = undefined;
      void start();
    };

    void start();
    media.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      media.removeEventListener("change", onChange);
      destroy?.();
    };
  }, []);

  return null;
}
