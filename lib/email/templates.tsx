import { Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { CSSProperties, ReactNode } from "react";

/**
 * Transactional emails (react-email). Light layout with the graphite/amber brand —
 * readable in every client, including dark-mode inversions. All copy arrives
 * already translated; templates only lay it out.
 */

const color = {
  page: "#F2F3F5",
  card: "#FFFFFF",
  ink: "#0A0B0D",
  text: "#1A1D23",
  muted: "#5B616B",
  line: "#E3E5E9",
  amber: "#FFB547",
  amberSoft: "#FFF4E2",
};

const font = "'Manrope', 'Segoe UI', Helvetica, Arial, sans-serif";

const s = {
  body: { backgroundColor: color.page, margin: 0, padding: "24px 0", fontFamily: font } satisfies CSSProperties,
  container: { maxWidth: "560px", margin: "0 auto", padding: "0 12px" } satisfies CSSProperties,
  header: { backgroundColor: color.ink, borderRadius: "14px 14px 0 0", padding: "22px 28px" } satisfies CSSProperties,
  brand: {
    margin: 0,
    color: color.amber,
    fontSize: "15px",
    fontWeight: 800,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  tagline: { margin: "4px 0 0", color: "#C9D1DC", fontSize: "12px" } satisfies CSSProperties,
  card: { backgroundColor: color.card, borderRadius: "0 0 14px 14px", padding: "28px" } satisfies CSSProperties,
  h1: {
    margin: "0 0 16px",
    color: color.ink,
    fontSize: "22px",
    lineHeight: "1.3",
    fontWeight: 800,
  } satisfies CSSProperties,
  p: { margin: "0 0 14px", color: color.text, fontSize: "15px", lineHeight: "1.6" } satisfies CSSProperties,
  muted: { margin: "0 0 10px", color: color.muted, fontSize: "13px", lineHeight: "1.55" } satisfies CSSProperties,
  note: {
    margin: "18px 0 0",
    padding: "12px 14px",
    backgroundColor: color.amberSoft,
    borderRadius: "10px",
    color: color.text,
    fontSize: "14px",
    lineHeight: "1.5",
  } satisfies CSSProperties,
  table: { width: "100%", borderCollapse: "collapse", margin: "8px 0 4px" } satisfies CSSProperties,
  th: {
    padding: "9px 12px 9px 0",
    borderBottom: `1px solid ${color.line}`,
    color: color.muted,
    fontSize: "13px",
    fontWeight: 500,
    textAlign: "left",
    verticalAlign: "top",
    width: "42%",
  } satisfies CSSProperties,
  td: {
    padding: "9px 0",
    borderBottom: `1px solid ${color.line}`,
    color: color.text,
    fontSize: "14px",
    textAlign: "right",
    verticalAlign: "top",
  } satisfies CSSProperties,
  sectionTitle: {
    margin: "22px 0 4px",
    color: color.muted,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  } satisfies CSSProperties,
  button: {
    display: "inline-block",
    marginTop: "20px",
    padding: "13px 22px",
    backgroundColor: color.amber,
    borderRadius: "10px",
    color: color.ink,
    fontSize: "15px",
    fontWeight: 700,
    textDecoration: "none",
  } satisfies CSSProperties,
  link: { color: color.ink, textDecoration: "underline" } satisfies CSSProperties,
  footer: { padding: "18px 28px 0", textAlign: "center" } satisfies CSSProperties,
};

export type SummaryRow = { label: string; value: ReactNode; strong?: boolean };

function Layout(props: { lang: string; preview: string; tagline: string; footer: ReactNode; children: ReactNode }) {
  return (
    <Html lang={props.lang}>
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{props.preview}</Preview>
      <Body style={s.body}>
        <Container style={s.container}>
          <Section style={s.header}>
            <Text style={s.brand}>Baltic Nuoma</Text>
            <Text style={s.tagline}>{props.tagline}</Text>
          </Section>
          <Section style={s.card}>{props.children}</Section>
          <Section style={s.footer}>{props.footer}</Section>
        </Container>
      </Body>
    </Html>
  );
}

function Summary({ rows }: { rows: SummaryRow[] }) {
  return (
    <table style={s.table} role="presentation" cellPadding={0} cellSpacing={0}>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <th style={s.th} scope="row">
              {row.label}
            </th>
            <td style={{ ...s.td, ...(row.strong ? { fontWeight: 800, fontSize: "16px", color: color.ink } : null) }}>
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type Shared = {
  lang: string;
  preview: string;
  tagline: string;
  title: string;
  summary: SummaryRow[];
  contacts: string;
  footerLines: string[];
};

function Footer({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <Text key={i} style={s.muted}>
          {line}
        </Text>
      ))}
    </>
  );
}

/** Customer: request received / confirmed / rejected. */
export function CustomerBookingEmail(
  props: Shared & {
    paragraphs: string[];
    note?: string;
    reason?: { label: string; text: string };
    cta?: { label: string; href: string };
  },
) {
  return (
    <Layout
      lang={props.lang}
      preview={props.preview}
      tagline={props.tagline}
      footer={<Footer lines={props.footerLines} />}
    >
      <Text style={s.h1}>{props.title}</Text>
      {props.paragraphs.map((p, i) => (
        <Text key={i} style={s.p}>
          {p}
        </Text>
      ))}
      {props.reason ? (
        <Text style={s.note}>
          <strong>{props.reason.label}:</strong> {props.reason.text}
        </Text>
      ) : null}
      <Summary rows={props.summary} />
      {props.note ? <Text style={s.note}>{props.note}</Text> : null}
      {props.cta ? (
        <Button href={props.cta.href} style={s.button}>
          {props.cta.label}
        </Button>
      ) : null}
      <Hr style={{ borderColor: color.line, margin: "24px 0 16px" }} />
      <Text style={s.muted}>{props.contacts}</Text>
    </Layout>
  );
}

/** Manager: new booking request with the customer's details and a link to the admin. */
export function ManagerBookingEmail(
  props: Shared & {
    customerTitle: string;
    customer: SummaryRow[];
    cta: { label: string; href: string };
  },
) {
  return (
    <Layout
      lang={props.lang}
      preview={props.preview}
      tagline={props.tagline}
      footer={<Footer lines={props.footerLines} />}
    >
      <Text style={s.h1}>{props.title}</Text>
      <Summary rows={props.summary} />
      <Text style={s.sectionTitle}>{props.customerTitle}</Text>
      <Summary rows={props.customer} />
      <Button href={props.cta.href} style={s.button}>
        {props.cta.label}
      </Button>
    </Layout>
  );
}

export function EmailLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={s.link}>
      {children}
    </Link>
  );
}
