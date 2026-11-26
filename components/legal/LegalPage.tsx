import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/layout/PageHero";
import type { LegalDocument } from "@/content/legal/types";
import type { StaticPathname } from "@/i18n/routing";
import { getLegalContext, LEGAL_UPDATED } from "@/lib/legal/context";
import { pageMetadata } from "@/lib/seo/metadata";

type PageKey = "terms" | "privacy" | "cookies";
type Params = { params: Promise<{ locale: Locale }> };

/**
 * Route factory for the three legal pages (texts in content/legal/*.{lt,en}.tsx).
 * DRAFT texts: every page carries the HTML comment the brief asks for until a lawyer reviews them.
 */
export function createLegalPage(key: PageKey, href: StaticPathname, docs: Record<Locale, LegalDocument>) {
  async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: `pages.${key}` });
    return pageMetadata({ locale, href, title: t("title"), description: t("description") });
  }

  async function Page({ params }: Params) {
    const { locale } = await params;
    setRequestLocale(locale);
    const [t, tl, tf, format, ctx] = await Promise.all([
      getTranslations(`pages.${key}`),
      getTranslations("legal"),
      getTranslations("footer"),
      getFormatter(),
      getLegalContext(locale),
    ]);
    const sections = docs[locale](ctx);
    const updated = format.dateTime(new Date(`${LEGAL_UPDATED}T12:00:00Z`), { dateStyle: "long" });

    const toc = (
      <ol className="flex flex-col gap-2 text-sm">
        {sections.map((s, i) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="flex gap-2 text-muted transition-colors hover:text-fg">
              <span className="w-5 shrink-0 text-right text-amber/80 tabular-nums">{i + 1}.</span>
              <span>{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    );

    return (
      <>
        <PageHero eyebrow={tf("legal")} title={t("title")} description={t("description")} />
        <div className="container-site grid gap-10 py-12 md:py-16 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={tl("toc")} className="lg:sticky lg:top-[calc(var(--nav-height)+2rem)] lg:self-start">
            <details className="group rounded-card border border-line bg-surface p-5 lg:hidden">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">
                {tl("toc")} <span className="text-muted group-open:hidden">({sections.length})</span>
              </summary>
              <div className="mt-4">{toc}</div>
            </details>
            <div className="hidden lg:block">
              <p className="mb-4 eyebrow">{tl("toc")}</p>
              {toc}
            </div>
          </nav>

          <article className="legal-prose max-w-3xl min-w-0">
            {/* ЧЕРНОВИК: требует юридической проверки (also emitted into the HTML below). */}
            <div hidden dangerouslySetInnerHTML={{ __html: "<!-- ЧЕРНОВИК: требует юридической проверки -->" }} />
            <p className="text-sm text-muted">{tl("updated", { date: updated })}</p>
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
                <h2 id={`${s.id}-h`}>
                  {i + 1}. {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </article>
        </div>
      </>
    );
  }

  return { generateMetadata, Page };
}
