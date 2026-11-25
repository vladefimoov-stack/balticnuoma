"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { CONSENT_COOKIE, CONSENT_MAX_AGE_DAYS, parseConsent, serializeConsent, type Consent } from "@/lib/consent";

type Choice = Pick<Consent, "maps" | "analytics">;

type ConsentState = {
  /** `undefined` while rendering on the server / before hydration, `null` = no choice yet. */
  consent: Consent | null | undefined;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  save: (choice: Choice) => void;
};

const ConsentContext = createContext<ConsentState | null>(null);

/* The cookie is the store: every tab/component reads the same value. */
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const readCookie = () =>
  document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1) ?? "";

/** Removes Google Analytics cookies (on this host and the parent domain) after consent is withdrawn. */
function clearAnalyticsCookies() {
  const host = location.hostname;
  const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
  for (const name of document.cookie.split("; ").map((c) => c.split("=")[0] ?? "")) {
    if (!name.startsWith("_ga")) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribe, readCookie, () => null);
  const consent = useMemo(() => (raw === null ? undefined : parseConsent(raw)), [raw]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // The pre-paint script hides the banner whenever a bn_consent cookie exists; if that cookie
  // turns out to be unusable (old version), show the banner again.
  useEffect(() => {
    if (consent === null) document.documentElement.removeAttribute("data-consent-set");
  }, [consent]);

  const save = useCallback(
    (choice: Choice) => {
      const hadAnalytics = consent?.analytics === true;
      const value = serializeConsent({ ...choice, at: Date.now() });
      const secure = location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
      setSettingsOpen(false);
      listeners.forEach((l) => l());
      // gtag can't be unloaded: drop its cookies and reload so it's gone for good.
      if (hadAnalytics && !choice.analytics) {
        clearAnalyticsCookies();
        location.reload();
      }
    },
    [consent?.analytics],
  );

  const value = useMemo<ConsentState>(
    () => ({
      consent,
      settingsOpen,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
      save,
    }),
    [consent, settingsOpen, save],
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

const noopSubscribe = () => () => {};

/**
 * Consent state for one component. While THIS component hydrates it always reports `undefined`
 * (like the server): parts of the page inside Suspense boundaries can hydrate after the provider
 * has already read the cookie, and rendering the real value then would not match the server HTML
 * (React error #418, seen on slow networks on pages with the map).
 */
export function useConsent(): ConsentState {
  const ctx = useContext(ConsentContext);
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!ctx) throw new Error("useConsent must be used inside <ConsentProvider>");
  return hydrated ? ctx : { ...ctx, consent: undefined };
}
