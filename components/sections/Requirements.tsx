import { CalendarCheck, FileCheck2, IdCard, UserCheck, Wallet, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ButtonAnchor } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Contacts } from "@/lib/data/defaults";
import type { RentalRules } from "@/lib/db/json";

type Props = { rules: RentalRules; deposit: number; contacts: Contacts };

export async function Requirements({ rules, deposit, contacts }: Props) {
  const t = await getTranslations("requirements");

  const items: Array<{ icon: LucideIcon; title: string; text: string }> = [
    {
      icon: CalendarCheck,
      title: t("experience.title", { years: rules.min_license_years }),
      text: t("experience.text"),
    },
    { icon: UserCheck, title: t("age.title", { age: rules.min_age }), text: t("age.text") },
    { icon: IdCard, title: t("documents.title"), text: t("documents.text") },
    { icon: Wallet, title: t("deposit.title", { deposit }), text: t("deposit.text") },
    { icon: FileCheck2, title: t("license.title"), text: t("license.text") },
  ];

  return (
    <section id="reikalavimai" className="border-y border-line bg-surface/40">
      <div className="container-site grid gap-14 py-24 md:py-32 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <div className="flex flex-col gap-8">
          <SectionHeading eyebrow={t("eyebrow")} title={t("title")} highlight={t("highlight").split(" ")} />
          <Reveal delay={2} className="flex flex-col gap-5 rounded-card border border-amber/25 bg-amber/5 p-6">
            <p className="font-display text-lg font-semibold">{t("help.title")}</p>
            <p className="leading-relaxed text-muted">{t("help.text")}</p>
            <ButtonAnchor
              href={contacts.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              className="self-start"
            >
              <WhatsAppIcon size={18} />
              {t("help.cta")}
            </ButtonAnchor>
          </Reveal>
        </div>
        <ul className="flex flex-col divide-y divide-line border-y border-line">
          {items.map(({ icon: Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i} className="flex gap-5 py-6">
              <Icon className="mt-0.5 size-6 shrink-0 text-amber" aria-hidden />
              <div>
                <h3 className="font-display text-base font-semibold">{title}</h3>
                <p className="mt-1.5 leading-relaxed text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
