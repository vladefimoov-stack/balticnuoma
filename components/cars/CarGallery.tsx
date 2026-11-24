"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils/cn";

export type GalleryImage = {
  url: string;
  alt: string;
  blurDataUrl: string | null;
};

/**
 * Swipeable photo gallery (native scroll-snap, so touch swipe works without a
 * library) with arrows, keyboard support, counter and thumbnails.
 */
export function CarGallery({ images, priority = false }: { images: GalleryImage[]; priority?: boolean }) {
  const t = useTranslations("gallery");
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(i, track.children.length - 1));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth)));
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  };

  if (images.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" role="region" aria-roledescription="carousel" aria-label={t("label")}>
      <div className="relative overflow-hidden rounded-card border border-line bg-surface">
        <div
          ref={trackRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          data-lenis-prevent
          className="flex aspect-[16/10] snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <div
              key={img.url}
              className="relative h-full w-full shrink-0 snap-center"
              role="group"
              aria-roledescription="slide"
              aria-label={t("slide", { current: i + 1, total: images.length })}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                priority={priority && i === 0}
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
                {...(img.blurDataUrl ? { placeholder: "blur", blurDataURL: img.blurDataUrl } : {})}
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              aria-label={t("previous")}
              className="absolute top-1/2 left-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line text-fg glass transition-colors hover:border-amber disabled:opacity-30"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              disabled={index === images.length - 1}
              aria-label={t("next")}
              className="absolute top-1/2 right-3 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-line text-fg glass transition-colors hover:border-amber disabled:opacity-30"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
            <p
              className="absolute right-3 bottom-3 rounded-pill border border-line px-3 py-1 text-xs text-fg glass"
              aria-live="polite"
            >
              {index + 1} / {images.length}
            </p>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" data-lenis-prevent>
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t("show", { number: i + 1 })}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-lg border transition-colors",
                i === index ? "border-amber" : "border-line opacity-60 hover:opacity-100",
              )}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
