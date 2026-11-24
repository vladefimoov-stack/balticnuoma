"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error");
  const tc = useTranslations("common");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex min-h-[85svh] items-center pt-(--nav-height) bg-aurora">
      <div className="container-site">
        <p className="text-gradient font-display text-[clamp(5rem,18vw,14rem)] leading-none font-semibold tracking-[-0.05em]">
          500
        </p>
        <h1 className="mt-4 text-display-md font-semibold">{t("title")}</h1>
        <p className="mt-4 max-w-lg text-muted">{t("text")}</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-muted/70">ID: {error.digest}</p>}
        <div className="mt-10 flex flex-wrap gap-4">
          <Button onClick={reset}>
            <RotateCcw className="size-4" aria-hidden />
            {t("retry")}
          </Button>
          <ButtonLink href="/" variant="secondary">
            {tc("backHome")}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
