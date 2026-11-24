import { Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { TelegramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { site, telegramUrl } from "@/lib/config/site";
import { cn } from "@/lib/utils/cn";

type Item = { href: string; label: string; icon: ReactNode; external: boolean };

/**
 * Floating contact buttons (bottom-right, every page).
 * Mobile: a single glass capsule. Desktop (md+): a compact vertical stack
 * of round glass buttons with hover tooltips. No JS needed.
 */
export async function FloatingContacts() {
  const t = await getTranslations("contact");

  const items: Item[] = [
    { href: site.whatsappUrl, label: t("whatsapp"), icon: <WhatsAppIcon size={20} />, external: true },
    ...(telegramUrl
      ? [{ href: telegramUrl, label: t("telegram"), icon: <TelegramIcon size={19} />, external: true }]
      : []),
    {
      href: `tel:${site.phone.e164}`,
      label: t("call", { phone: site.phone.display }),
      icon: <Phone className="size-[19px]" aria-hidden />,
      external: false,
    },
  ];

  return (
    <aside
      aria-label={t("label")}
      className={cn(
        "fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex items-center",
        "max-md:rounded-pill max-md:border max-md:border-line max-md:p-1 max-md:shadow-card max-md:glass",
        "md:right-6 md:bottom-6 md:flex-col md:gap-2.5",
      )}
    >
      {items.map((item, i) => (
        <a
          key={item.href}
          href={item.href}
          aria-label={item.label}
          {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={cn(
            // Smooth color change on hover/focus: glass → solid amber, icon → dark. No movement.
            "group relative grid size-11 place-items-center rounded-full text-fg/90",
            "transition-[color,background-color,border-color] duration-500 ease-out",
            "hover:bg-amber hover:text-on-amber focus-visible:bg-amber focus-visible:text-on-amber",
            "md:size-12 md:border md:border-line md:shadow-card md:glass md:hover:border-amber md:focus-visible:border-amber",
            i > 0 &&
              "max-md:before:absolute max-md:before:inset-y-3 max-md:before:-left-px max-md:before:w-px max-md:before:bg-line",
          )}
        >
          {item.icon}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-full mr-3 hidden -translate-y-1/2 rounded-pill border border-line px-3 py-1.5 text-xs font-medium whitespace-nowrap text-fg opacity-0 glass transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 md:block"
          >
            {item.label}
          </span>
        </a>
      ))}
    </aside>
  );
}
