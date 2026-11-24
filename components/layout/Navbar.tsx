"use client";

import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Link, usePathname } from "@/i18n/navigation";
import { site } from "@/lib/config/site";
import { lockScroll } from "@/lib/motion/lenis";
import { cn } from "@/lib/utils/cn";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { isActivePath, navItems } from "./nav-items";

export function Navbar() {
  const t = useTranslations("nav");
  const tc = useTranslations("contact");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobile menu: lock page scroll, close on Escape, manage focus.
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onResize = () => window.innerWidth >= 1024 && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      lockScroll(false);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const close = () => setOpen(false);
  const solid = scrolled || open;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "border-b transition-[background-color,border-color,backdrop-filter] duration-500",
          solid ? "border-line glass" : "border-transparent",
        )}
      >
        <nav
          aria-label={t("label")}
          className="container-site flex h-(--nav-height) items-center justify-between gap-6"
        >
          <Link href="/" className="-m-1 rounded-lg p-1" aria-label={`Baltic Nuoma — ${t("home")}`} onClick={close}>
            <Logo />
          </Link>

          <ul className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative block px-4 py-2 text-sm font-medium transition-colors duration-300",
                      active ? "text-fg" : "text-muted hover:text-fg",
                    )}
                  >
                    {t(item.key)}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-4 -bottom-px h-px origin-left bg-linear-to-r from-amber to-silver transition-transform duration-500 ease-out-expo",
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            <LanguageSwitcher className="hidden sm:flex" />
            <ButtonLink href="/automobiliai" size="sm" className="hidden md:inline-flex">
              {t("book")}
              <ArrowUpRight className="size-4" aria-hidden />
            </ButtonLink>
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              className="relative grid size-10 place-items-center rounded-full border border-line text-fg transition-colors hover:border-line-strong lg:hidden"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute h-px w-4 bg-current transition-transform duration-300 ease-out-expo",
                  open ? "rotate-45" : "-translate-y-[3px]",
                )}
              />
              <span
                aria-hidden
                className={cn(
                  "absolute h-px w-4 bg-current transition-transform duration-300 ease-out-expo",
                  open ? "-rotate-45" : "translate-y-[3px]",
                )}
              />
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label={t("label")}
            data-lenis-prevent
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-(--nav-height) bottom-0 z-40 overflow-y-auto bg-bg/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-site flex min-h-full flex-col justify-between gap-10 pt-8 pb-28">
              <ul className="flex flex-col">
                {[{ href: "/" as const, key: "home" as const }, ...navItems].map((item, i) => {
                  const active = isActivePath(pathname, item.href);
                  return (
                    <m.li
                      key={item.href}
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + i * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="border-b border-line"
                    >
                      <Link
                        ref={i === 0 ? firstLinkRef : undefined}
                        href={item.href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between py-5 font-display text-2xl tracking-tight",
                          active ? "text-amber" : "text-fg",
                        )}
                      >
                        {t(item.key)}
                        <ArrowUpRight className="size-5 text-muted" aria-hidden />
                      </Link>
                    </m.li>
                  );
                })}
              </ul>

              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="flex flex-col gap-6"
              >
                <ButtonLink href="/automobiliai" size="lg" onClick={close} className="w-full">
                  {t("book")}
                </ButtonLink>
                <div className="flex items-center justify-between">
                  <a
                    href={`tel:${site.phone.e164}`}
                    className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg"
                    aria-label={tc("call", { phone: site.phone.display })}
                  >
                    <Phone className="size-4" aria-hidden />
                    {site.phone.display}
                  </a>
                  <LanguageSwitcher className="flex" onNavigate={close} />
                </div>
              </m.div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
