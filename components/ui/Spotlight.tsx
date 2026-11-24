"use client";

import type { PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Cursor highlight: a soft amber glow follows the mouse inside the card.
 * Purely visual (CSS variables + the `spotlight` utility); ignored on touch.
 */
export function Spotlight({ children, className }: { children: ReactNode; className?: string }) {
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };
  return (
    <div onPointerMove={onMove} className={cn("spotlight", className)}>
      {children}
    </div>
  );
}
