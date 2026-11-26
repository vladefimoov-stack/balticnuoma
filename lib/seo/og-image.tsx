import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import sharp from "sharp";
import { BODY, GLASS, PILLAR, SHAPE_BY_BODY } from "@/components/cars/car-shapes";
import { site } from "@/lib/config/site";
import { pick, type CarListItem } from "@/lib/data/cars";
import { getPublicSettings } from "@/lib/data/settings";
import type { BodyType } from "@/lib/supabase/types";
import { OG_SIZE } from "./metadata";

/**
 * Branded 1200×630 Open Graph cards (rendered with next/og → Satori).
 * Fonts are the site's own (Unbounded + Manrope): Fontsource latin + latin-ext WOFF subsets merged
 * into one file per weight — Satori doesn't fall back between two files of one family, and the
 * Lithuanian letters live in latin-ext. Listed in next.config `outputFileTracingIncludes`.
 */

const COLORS = {
  bg: "#0A0B0D",
  surface: "#121418",
  fg: "#F2F3F5",
  muted: "#8A8F98",
  amber: "#FFB547",
  amberSoft: "#FFD08A",
  silver: "#C9D1DC",
  line: "rgba(255,255,255,0.12)",
};

const FONT_DIR = join(process.cwd(), "lib/seo/fonts");

type Font = { name: string; data: Buffer; weight: 500 | 600 | 700; style: "normal" };
let fontsPromise: Promise<Font[]> | null = null;

function loadFonts() {
  fontsPromise ??= Promise.all(
    (
      [
        ["Unbounded", 600, "unbounded-600.woff"],
        ["Manrope", 500, "manrope-500.woff"],
        ["Manrope", 700, "manrope-700.woff"],
      ] as const
    ).map(async ([name, weight, file]) => ({
      name,
      weight,
      style: "normal" as const,
      data: await readFile(join(FONT_DIR, file)),
    })),
  ).catch((error) => {
    fontsPromise = null;
    throw error;
  });
  return fontsPromise;
}

const svgUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const LOGO_MARK = svgUri(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="96" height="96"><defs><linearGradient id="g" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${COLORS.amber}"/><stop offset=".55" stop-color="${COLORS.amberSoft}"/><stop offset="1" stop-color="${COLORS.silver}"/></linearGradient></defs><g fill="none" stroke="url(#g)" stroke-linecap="round"><path d="M3 38q10.5-7 21 0t21 0" stroke-width="3.8"/><path d="M15 27q7-4.6 14 0t14 0" stroke-width="3.1"/><path d="M26 17.5q4-2.8 8 0t8 0" stroke-width="2.5"/></g></svg>`,
);

/** The same line-art silhouette as <CarPlaceholder>, with literal colors (no CSS variables here). */
function silhouette(bodyType: BodyType | null) {
  const shape = SHAPE_BY_BODY[bodyType ?? "sedan"];
  const wheels = [96, 306]
    .map(
      (cx) =>
        `<circle cx="${cx}" cy="107" r="22" stroke="rgba(201,209,220,0.55)" stroke-width="1.4"/><circle cx="${cx}" cy="107" r="11" stroke="rgba(201,209,220,0.25)" stroke-width="1"/>`,
    )
    .join("");
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 160" width="800" height="320" fill="none"><defs><linearGradient id="l" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLORS.amber}"/><stop offset=".6" stop-color="${COLORS.amberSoft}"/><stop offset="1" stop-color="${COLORS.silver}"/></linearGradient><linearGradient id="f" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${COLORS.amber}" stop-opacity="0"/><stop offset=".5" stop-color="${COLORS.amber}" stop-opacity=".7"/><stop offset="1" stop-color="${COLORS.amber}" stop-opacity="0"/></linearGradient></defs><path d="M10 129 H390" stroke="url(#f)" stroke-width="1"/><path d="${BODY[shape]}" stroke="url(#l)" stroke-width="1.6" stroke-linejoin="round" fill="rgba(255,255,255,0.02)"/><path d="${GLASS[shape]}" stroke="rgba(201,209,220,0.45)" stroke-width="1.2" fill="rgba(201,209,220,0.05)"/><path d="M${PILLAR[shape]} ${shape === "suv" ? 37 : 46} V${shape === "suv" ? 68 : 75}" stroke="rgba(201,209,220,0.35)" stroke-width="1.2"/>${wheels}<path d="M26 96 L44 92" stroke="${COLORS.amber}" stroke-width="2.2" stroke-linecap="round"/><path d="M372 88 L377 100" stroke="#EF4444" stroke-opacity=".8" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  );
}

/** Satori can't decode WebP (our photo format) — convert the cover to a cropped JPEG. */
async function photoDataUri(url: string, width: number, height: number) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch (error) {
    console.error("[og] cover photo failed:", error);
    return null;
  }
}

const host = new URL(site.url).host.replace(/^www\./, "");

function Brand({ size = 30 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.55 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
      <img src={LOGO_MARK} width={size * 2} height={size * 2} alt="" />
      <span style={{ fontFamily: "Unbounded", fontSize: size, fontWeight: 600, color: COLORS.fg }}>{site.name}</span>
    </div>
  );
}

const frame = {
  width: "100%",
  height: "100%",
  display: "flex",
  backgroundColor: COLORS.bg,
  color: COLORS.fg,
  fontFamily: "Manrope",
} as const;

/** Site card: brand, headline, tagline, address · phone · domain. */
export async function renderSiteOgImage(locale: Locale) {
  const [t, fonts, { contacts }] = await Promise.all([
    getTranslations({ locale, namespace: "metadata" }),
    loadFonts(),
    getPublicSettings(),
  ]);

  return new ImageResponse(
    <div
      style={{
        ...frame,
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 72px 52px",
        backgroundImage:
          "radial-gradient(circle at 88% 8%, rgba(255,181,71,0.26), rgba(255,181,71,0) 52%), radial-gradient(circle at 0% 100%, rgba(201,209,220,0.10), rgba(201,209,220,0) 45%)",
      }}
    >
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            fontFamily: "Unbounded",
            fontSize: 66,
            fontWeight: 600,
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            maxWidth: 1000,
          }}
        >
          {t("ogHeadline")}
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 32 }}>
          <div style={{ fontSize: 29, fontWeight: 500, color: COLORS.muted, lineHeight: 1.35, maxWidth: 560 }}>
            {t("ogTagline")}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          <img src={silhouette("sedan")} width={440} height={176} alt="" />
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${COLORS.line}`,
          paddingTop: 26,
          fontSize: 26,
          fontWeight: 500,
          color: COLORS.silver,
        }}
      >
        <span>
          {contacts.officeOpen ? contacts.address : site.address.city} · {contacts.phone}
        </span>
        <span style={{ color: COLORS.amber, fontWeight: 700 }}>{host}</span>
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}

/** Car card: cover photo (or silhouette) + category, title, key specs and the "from" price. */
export async function renderCarOgImage(car: CarListItem, locale: Locale) {
  const PHOTO_W = 500;
  const [t, ts, fonts, photo] = await Promise.all([
    getTranslations({ locale, namespace: "cars" }),
    getTranslations({ locale, namespace: "specs.values" }),
    loadFonts(),
    car.cover ? photoDataUri(car.cover.url, PHOTO_W, OG_SIZE.height) : Promise.resolve(null),
  ]);
  const title = pick(car.title, locale);
  const { specs } = car;
  const meta = [
    car.year ? String(car.year) : null,
    specs.fuel ? ts(`fuel.${specs.fuel}`) : null,
    specs.transmission ? ts(`transmission.${specs.transmission}`) : null,
    specs.seats ? t("seats", { count: specs.seats }) : null,
  ].filter(Boolean);

  return new ImageResponse(
    <div style={frame}>
      <div
        style={{
          display: "flex",
          width: PHOTO_W,
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.surface,
          backgroundImage: "radial-gradient(circle at 50% 60%, rgba(255,181,71,0.16), rgba(255,181,71,0) 60%)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
        <img
          src={photo ?? silhouette(car.bodyType)}
          width={photo ? PHOTO_W : 440}
          height={photo ? OG_SIZE.height : 176}
          alt=""
          style={{ objectFit: "cover" }}
        />
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 60px 48px",
          borderLeft: `1px solid ${COLORS.line}`,
          backgroundImage: "radial-gradient(circle at 100% 0%, rgba(255,181,71,0.18), rgba(255,181,71,0) 50%)",
        }}
      >
        <Brand size={24} />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: COLORS.amber,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
            }}
          >
            {pick(car.category.name, locale)}
          </span>
          <div
            style={{
              fontFamily: "Unbounded",
              fontSize: title.length > 26 ? 44 : 54,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          {meta.length > 0 && (
            <div style={{ fontSize: 26, fontWeight: 500, color: COLORS.muted }}>{meta.join(" · ")}</div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            borderTop: `1px solid ${COLORS.line}`,
            paddingTop: 24,
          }}
        >
          {car.fromPerDay !== null ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 26, color: COLORS.muted }}>{t("from")}</span>
              <span style={{ fontFamily: "Unbounded", fontSize: 60, fontWeight: 600 }}>{car.fromPerDay} €</span>
              <span style={{ fontSize: 26, color: COLORS.muted }}>/ {t("day")}</span>
            </div>
          ) : (
            <span style={{ fontSize: 26, color: COLORS.muted }}>{t("priceOnRequest")}</span>
          )}
          <span style={{ fontSize: 24, fontWeight: 700, color: COLORS.amber }}>{host}</span>
        </div>
      </div>
    </div>,
    { ...OG_SIZE, fonts },
  );
}
