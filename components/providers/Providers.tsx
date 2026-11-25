"use client";

import { domAnimation, LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";
import { GoogleAnalytics } from "@/components/consent/GoogleAnalytics";
import { ScrollToTop } from "./ScrollToTop";
import { SmoothScroll } from "./SmoothScroll";

/**
 * Client-side providers for the public site:
 * - LazyMotion (strict) keeps framer-motion's footprint small — use `m.*`, not `motion.*`.
 * - MotionConfig honours the OS "reduce motion" setting for every animation.
 * - Lenis smooth scrolling (skipped when the user prefers reduced motion).
 * - ScrollToTop: every navigation starts at the top of the new page.
 * - Cookie consent: banner + GA4 (only after consent) + the state MapEmbed reads.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <ConsentProvider>
          <SmoothScroll />
          <ScrollToTop />
          {children}
          <CookieBanner />
          <GoogleAnalytics />
        </ConsentProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
