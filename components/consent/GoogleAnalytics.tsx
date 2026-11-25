"use client";

import Script from "next/script";
import { analyticsEnabled, GA_MEASUREMENT_ID } from "@/lib/consent";
import { useConsent } from "./ConsentProvider";

/** GA4 — loaded only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set AND the visitor allowed analytics. */
export function GoogleAnalytics() {
  const { consent } = useConsent();
  if (!analyticsEnabled || !consent?.analytics) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
      </Script>
    </>
  );
}
