import { ArrowUpRight, Clock, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { TelegramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { mapsDirectionsUrl } from "@/lib/config/site";
import type { Contacts, OpeningHours } from "@/lib/data/defaults";
import { formatOpeningHours } from "@/lib/format/hours";

type Props = { contacts: Contacts; hours: OpeningHours; locale: string };

type Item = {
  key: string;
  icon: LucideIcon | (() => ReactNode);
  label: string;
  value: ReactNode;
  href?: string;
  external?: boolean;
};

/** Address, phone, messengers, email and opening hours as a list of large rows. */
export async function ContactList({ contacts, hours, locale }: Props) {
  const t = await getTranslations("contactSection");
  const tc = await getTranslations("contact");

  const items: Item[] = [
    {
      key: "address",
      icon: MapPin,
      label: t("address"),
      value: (
        <>
          {contacts.address}
          <span className="mt-1 flex items-center gap-1 text-sm text-amber">
            {tc("directions")}
            <ArrowUpRight className="size-3.5" aria-hidden />
          </span>
        </>
      ),
      href: mapsDirectionsUrl,
      external: true,
    },
    { key: "phone", icon: Phone, label: t("phone"), value: contacts.phone, href: `tel:${contacts.phoneE164}` },
    {
      key: "whatsapp",
      icon: () => <WhatsAppIcon size={20} />,
      label: "WhatsApp",
      value: t("whatsappValue"),
      href: contacts.whatsappUrl,
      external: true,
    },
    ...(contacts.telegramUrl
      ? [
          {
            key: "telegram",
            icon: () => <TelegramIcon size={20} />,
            label: "Telegram",
            value: t("telegramValue"),
            href: contacts.telegramUrl,
            external: true,
          },
        ]
      : []),
    ...(contacts.email
      ? [{ key: "email", icon: Mail, label: t("email"), value: contacts.email, href: `mailto:${contacts.email}` }]
      : []),
    {
      key: "hours",
      icon: Clock,
      label: t("hours"),
      value: formatOpeningHours(hours, locale).map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      )),
    },
  ];

  return (
    <ul className="flex flex-col divide-y divide-line border-y border-line">
      {items.map(({ key, icon: Icon, label, value, href, external }) => {
        const content = (
          <>
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line text-amber">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="text-xs tracking-[0.14em] text-muted uppercase">{label}</span>
              <span className="mt-1 text-lg font-medium">{value}</span>
            </span>
          </>
        );
        return (
          <li key={key}>
            {href ? (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-center gap-5 py-5 transition-colors hover:text-amber-soft"
              >
                {content}
              </a>
            ) : (
              <div className="flex items-center gap-5 py-5">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
