import Link from "next/link";
import { fontVariables } from "@/lib/fonts";

/**
 * Fallback 404 for requests outside the `[locale]` segment (e.g. paths the
 * i18n middleware skips). Localized 404s live in `app/[locale]/not-found.tsx`.
 */
export default function GlobalNotFound() {
  return (
    <html lang="lt" className={fontVariables}>
      <body>
        <main className="flex min-h-svh items-center bg-aurora">
          <div className="container-site">
            <p className="text-gradient font-display text-[clamp(5rem,18vw,14rem)] leading-none font-semibold tracking-[-0.05em]">
              404
            </p>
            <h1 className="mt-4 text-display-md font-semibold">Kelias čia baigiasi</h1>
            <p className="mt-4 max-w-lg text-muted">Puslapis nerastas. · Page not found.</p>
            <Link
              href="/"
              className="mt-10 inline-flex h-11 items-center rounded-pill bg-amber px-6 text-sm font-semibold text-on-amber"
            >
              Grįžti į pradžią
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
