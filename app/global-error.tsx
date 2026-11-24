"use client";

import { useEffect } from "react";
import "./globals.css";

/** Last-resort error boundary (errors in root layouts). Must render its own <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="lt">
      <body>
        <main className="flex min-h-svh items-center bg-aurora">
          <div className="container-site">
            <p className="text-gradient text-[clamp(5rem,18vw,14rem)] leading-none font-bold tracking-[-0.05em]">500</p>
            <h1 className="mt-4 text-3xl font-semibold">Kažkas nutiko · Something went wrong</h1>
            <p className="mt-4 max-w-lg text-muted">
              Įvyko netikėta klaida. Bandykite dar kartą. · An unexpected error occurred. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-10 inline-flex h-11 items-center rounded-pill bg-amber px-6 text-sm font-semibold text-on-amber"
            >
              Bandyti dar kartą · Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
