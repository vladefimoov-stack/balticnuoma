import "server-only";
import { render } from "@react-email/render";
import { createTranslator } from "next-intl";
import type { ReactElement } from "react";
import { site } from "@/lib/config/site";
import { getPublicSettings } from "@/lib/data/settings";
import type { L10n } from "@/lib/data/cars";
import { pick } from "@/lib/data/cars";
import { bookingNumber, formatPrice, formatSelection } from "@/lib/booking/format";
import type { Selection } from "@/lib/booking/schema";
import type { Quote } from "@/lib/pricing/calculate";
import { getPathname } from "@/i18n/navigation";
import en from "@/messages/en.json";
import lt from "@/messages/lt.json";
import { sendEmail } from "./send";
import { CustomerBookingEmail, EmailLink, ManagerBookingEmail, type SummaryRow } from "./templates";

type Locale = "lt" | "en";

/** Everything an email about one booking needs (from the action or from a DB row). */
export type BookingEmailInput = {
  id: string;
  number: number;
  locale: Locale;
  car: { slug: string; title: L10n };
  selection: Selection;
  quote: Quote;
  deposit: number;
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    licenseYear: number;
    comment: string | null;
  };
};

function translator(locale: Locale) {
  return createTranslator({ locale, messages: (locale === "en" ? en : lt) as typeof lt });
}
type T = ReturnType<typeof translator>;

const TARIFF_KEY = { hourly: "hourly", daily: "daily", weekly: "weekly", long_term: "longTerm" } as const;

function summaryRows(t: T, input: BookingEmailInput, locale: Locale): SummaryRow[] {
  const price = (n: number) => formatPrice(n, locale);
  const { quote, selection } = input;
  const duration =
    selection.mode === "days"
      ? t("booking.duration.days", { count: quote.days ?? 0 })
      : t("booking.duration.hours", { count: selection.hours });

  return [
    { label: t("emails.summary.number"), value: bookingNumber(input.number) },
    { label: t("emails.summary.car"), value: pick(input.car.title, locale) },
    { label: t("emails.summary.period"), value: formatSelection(selection, locale) },
    { label: t("emails.summary.duration"), value: duration },
    { label: t("emails.summary.tariff"), value: t(`tariffs.${TARIFF_KEY[quote.rentalType]}`) },
    ...quote.lines.map((line) => ({
      label: t(`booking.lines.${line.kind}`, { count: line.quantity, price: price(line.unitPrice) }),
      value: price(line.total),
    })),
    { label: t("emails.summary.total"), value: price(quote.total), strong: true },
    { label: t("emails.summary.deposit"), value: price(input.deposit) },
  ];
}

async function shared(t: T, input: BookingEmailInput, locale: Locale) {
  const { contacts } = await getPublicSettings();
  const host = site.url.replace(/^https?:\/\//, "");
  return {
    lang: locale,
    tagline: t("emails.brandTagline"),
    summary: summaryRows(t, input, locale),
    contacts: contacts.email
      ? t("emails.contactsWithEmail", { phone: contacts.phone, email: contacts.email })
      : t("emails.contacts", { phone: contacts.phone }),
    footerLines: [`Baltic Nuoma · ${contacts.address}`, t("emails.footerNote", { site: host })],
    replyTo: contacts.email,
    period: formatSelection(input.selection, locale),
  };
}

async function toEmail(element: ReactElement) {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}

function carUrl(input: BookingEmailInput, locale: Locale) {
  return `${site.url}${getPathname({ locale, href: { pathname: "/automobiliai/[slug]", params: { slug: input.car.slug } } })}`;
}

/** "Užklausa gauta" to the customer (in their language) + details to the manager (LT). */
export async function sendBookingRequestEmails(input: BookingEmailInput, notifyTo: string | null) {
  const number = bookingNumber(input.number);

  // Customer
  {
    const locale = input.locale;
    const t = translator(locale);
    const base = await shared(t, input, locale);
    const car = pick(input.car.title, locale);
    const { html, text } = await toEmail(
      <CustomerBookingEmail
        {...base}
        preview={t("emails.received.preview", { car, period: base.period })}
        title={t("emails.received.title")}
        paragraphs={[
          t("emails.received.greeting", { name: input.customer.firstName }),
          t("emails.received.text", { car }),
        ]}
        note={t("emails.received.note")}
      />,
    );
    await sendEmail({
      to: input.customer.email,
      subject: t("emails.received.subject", { number }),
      html,
      text,
      replyTo: base.replyTo,
      idempotencyKey: `booking-received-${input.id}`,
    });
  }

  // Manager (always Lithuanian)
  if (notifyTo) {
    const t = translator("lt");
    const base = await shared(t, input, "lt");
    const car = pick(input.car.title, "lt");
    const name = `${input.customer.firstName} ${input.customer.lastName}`;
    const { html, text } = await toEmail(
      <ManagerBookingEmail
        {...base}
        preview={t("emails.manager.preview", {
          name,
          phone: input.customer.phone,
          total: formatPrice(input.quote.total, "lt"),
        })}
        title={t("emails.manager.title")}
        customerTitle={t("emails.manager.customer")}
        customer={[
          { label: t("emails.manager.name"), value: name },
          {
            label: t("emails.manager.phone"),
            value: <EmailLink href={`tel:${input.customer.phone}`}>{input.customer.phone}</EmailLink>,
          },
          {
            label: t("emails.manager.email"),
            value: <EmailLink href={`mailto:${input.customer.email}`}>{input.customer.email}</EmailLink>,
          },
          { label: t("emails.manager.licenseYear"), value: String(input.customer.licenseYear) },
          ...(input.customer.comment ? [{ label: t("emails.manager.comment"), value: input.customer.comment }] : []),
          {
            label: t("emails.manager.language"),
            value: input.locale === "en" ? t("emails.manager.languageEn") : t("emails.manager.languageLt"),
          },
        ]}
        footerLines={[base.footerLines[0], t("emails.manager.footer", { site: site.url.replace(/^https?:\/\//, "") })]}
        cta={{ label: t("emails.manager.cta"), href: `${site.url}/admin/rezervacijos/${input.id}` }}
      />,
    );
    await sendEmail({
      to: notifyTo,
      subject: t("emails.manager.subject", { number, car, period: base.period }),
      html,
      text,
      replyTo: input.customer.email,
      idempotencyKey: `booking-manager-${input.id}`,
    });
  } else {
    console.warn(`[email] no manager address (settings.notifications / BOOKING_NOTIFY_EMAIL) for ${number}`);
  }
}

/** Status change emails to the customer — used by the admin panel (phase 6). */
export async function sendBookingStatusEmail(
  input: BookingEmailInput,
  status: { status: "confirmed" } | { status: "rejected"; reason: string },
) {
  const locale = input.locale;
  const t = translator(locale);
  const base = await shared(t, input, locale);
  const car = pick(input.car.title, locale);
  const number = bookingNumber(input.number);

  const element =
    status.status === "confirmed" ? (
      <CustomerBookingEmail
        {...base}
        preview={t("emails.confirmed.preview", { car, period: base.period })}
        title={t("emails.confirmed.title")}
        paragraphs={[t("emails.received.greeting", { name: input.customer.firstName }), t("emails.confirmed.text")]}
        note={t("emails.confirmed.note")}
      />
    ) : (
      <CustomerBookingEmail
        {...base}
        preview={t("emails.rejected.preview", { number })}
        title={t("emails.rejected.title")}
        paragraphs={[
          t("emails.received.greeting", { name: input.customer.firstName }),
          t("emails.rejected.text", { car }),
        ]}
        reason={{ label: t("emails.rejected.reason"), text: status.reason }}
        cta={{ label: t("emails.rejected.cta"), href: carUrl(input, locale) }}
      />
    );

  const { html, text } = await toEmail(element);
  return sendEmail({
    to: input.customer.email,
    subject: t(`emails.${status.status}.subject`, { number }),
    html,
    text,
    replyTo: base.replyTo,
    idempotencyKey: `booking-${status.status}-${input.id}`,
  });
}
