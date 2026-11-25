"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { analyticsEnabled } from "@/lib/consent";
import { useConsent } from "./ConsentProvider";

/**
 * Cookie banner: shown until the visitor decides, and again from "Slapukų nustatymai".
 * "Necessary only" and "Accept all" look the same — refusing must be as easy as accepting.
 * Non-modal: the page stays usable; nothing optional loads before a choice.
 *
 * It is part of the server HTML (so it paints with the page instead of after hydration — on
 * phones it's the LCP element for first-time visitors). For visitors who already chose, the
 * inline script in [locale]/layout.tsx marks <html data-consent-set> before the first paint and
 * CSS hides it; after hydration React removes it.
 */
export function CookieBanner() {
  const t = useTranslations("consent");
  const { consent, settingsOpen, closeSettings, save } = useConsent();
  const [expanded, setExpanded] = useState(false);
  const [maps, setMaps] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const id = useId();

  // Opened from the footer / policy page: show the current choice and move focus into the panel.
  useEffect(() => {
    if (!settingsOpen) return;
    setMaps(consent?.maps ?? false);
    setAnalytics(consent?.analytics ?? false);
    ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only when the panel opens
  }, [settingsOpen]);

  useEffect(() => {
    if (!settingsOpen || !consent) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeSettings();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen, consent, closeSettings]);

  if (consent !== undefined && consent !== null && !settingsOpen) return null;
  const detailed = expanded || settingsOpen;

  type Category = {
    key: "necessary" | "maps" | "analytics";
    checked: boolean;
    disabled: boolean;
    onChange: (on: boolean) => void;
  };
  const categories: Category[] = [
    { key: "necessary", checked: true, disabled: true, onChange: () => {} },
    { key: "maps", checked: maps, disabled: false, onChange: setMaps },
    ...(analyticsEnabled
      ? [{ key: "analytics" as const, checked: analytics, disabled: false, onChange: setAnalytics }]
      : []),
  ];

  return (
    <section
      ref={ref}
      tabIndex={-1}
      data-consent-banner
      data-open={settingsOpen || undefined}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      data-lenis-prevent
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[45] max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-card border border-line p-5 shadow-card glass outline-none sm:right-auto sm:bottom-5 sm:left-5 sm:w-[27rem]"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={`${id}-title`} className="text-base font-semibold">
          {t("title")}
        </h2>
        {settingsOpen && consent && (
          <button
            type="button"
            onClick={closeSettings}
            aria-label={t("close")}
            className="-m-2 grid size-9 shrink-0 place-items-center rounded-full text-muted hover:text-fg"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <p id={`${id}-text`} className="mt-2 text-sm leading-relaxed text-muted">
        {t(analyticsEnabled ? "textAnalytics" : "text")}{" "}
        <Link href="/slapukai" className="text-fg underline underline-offset-2 hover:text-amber">
          {t("policy")}
        </Link>
      </p>

      {detailed && (
        <fieldset className="mt-4 flex flex-col gap-2">
          <legend className="sr-only">{t("settings")}</legend>
          {categories.map((c) => (
            <label
              key={c.key}
              className="flex cursor-pointer gap-3 rounded-xl border border-line bg-bg/40 p-3 has-disabled:cursor-default"
            >
              <input
                type="checkbox"
                checked={c.checked}
                disabled={c.disabled}
                onChange={(e) => c.onChange(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-amber"
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold">
                  {t(`categories.${c.key}.title`)}
                  {c.disabled && <span className="ml-2 text-xs font-normal text-muted">{t("alwaysOn")}</span>}
                </span>
                <span className="text-xs leading-relaxed text-muted">{t(`categories.${c.key}.text`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" onClick={() => save({ maps: false, analytics: false })}>
          {t("necessaryOnly")}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => save({ maps: true, analytics: analyticsEnabled })}>
          {t("acceptAll")}
        </Button>
        {detailed ? (
          <Button size="sm" className="col-span-2" onClick={() => save({ maps, analytics })}>
            {t("save")}
          </Button>
        ) : (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="col-span-2 justify-self-center text-xs text-muted underline underline-offset-2 hover:text-fg"
          >
            {t("settings")}
          </button>
        )}
      </div>
    </section>
  );
}

/** "Slapukų nustatymai" — reopens the banner (footer, cookie policy). */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("consent");
  const { openSettings } = useConsent();
  return (
    <button type="button" onClick={openSettings} className={className}>
      {t("open")}
    </button>
  );
}
