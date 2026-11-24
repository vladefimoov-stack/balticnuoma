"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";
import { getLenis } from "@/lib/motion/lenis";

/**
 * Every page change starts at the top (owner's requirement) — including
 * back/forward and language switches. Next.js alone keeps the old position when
 * the new page's top is "already visible", and Lenis keeps its own animated
 * scroll target, so both are reset before the new page paints.
 * Links to an anchor (#section) are left alone.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Browsers would otherwise restore the old position on back/forward.
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  }, []);

  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (window.location.hash) return;
    getLenis()?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
