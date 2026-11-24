import { getTranslations } from "next-intl/server";
import { ContactList } from "@/components/contact/ContactList";
import { MapEmbed } from "@/components/contact/MapEmbed";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Contacts, OpeningHours } from "@/lib/data/defaults";

type Props = { contacts: Contacts; hours: OpeningHours; locale: string; headingAs?: "h1" | "h2" };

export async function ContactSection({ contacts, hours, locale, headingAs = "h2" }: Props) {
  const t = await getTranslations("contactSection");

  return (
    <section id="kontaktai" className="container-site grid gap-12 py-24 md:py-32 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-10">
        <SectionHeading
          as={headingAs}
          eyebrow={t("eyebrow")}
          title={t("title")}
          highlight={t("highlight").split(" ")}
          description={t("description")}
        />
        <Reveal delay={1}>
          <ContactList contacts={contacts} hours={hours} locale={locale} />
        </Reveal>
      </div>
      <Reveal delay={2} className="min-h-[360px] lg:min-h-0">
        <MapEmbed query={contacts.address} title={t("mapTitle")} locale={locale} className="h-full min-h-[360px]" />
      </Reveal>
    </section>
  );
}
