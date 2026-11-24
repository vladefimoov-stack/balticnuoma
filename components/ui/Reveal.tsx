"use client";

import {
  createElement,
  Fragment,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Scroll reveal without layout shift or flashes:
 * - server HTML is fully visible (works without JS, good for SEO/LCP);
 * - on mount, elements that are still BELOW the viewport switch to
 *   data-reveal="pending" (hidden), and animate in when they scroll into view;
 * - elements already on screen and users with reduced motion are left untouched.
 * Styles live in globals.css ([data-reveal] rules).
 */

const callbacks = new WeakMap<Element, () => void>();
let sharedObserver: IntersectionObserver | null = null;

function observe(el: Element, onEnter: () => void) {
  sharedObserver ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        callbacks.get(entry.target)?.();
        callbacks.delete(entry.target);
        sharedObserver?.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
  );
  callbacks.set(el, onEnter);
  sharedObserver.observe(el);
  return () => {
    callbacks.delete(el);
    sharedObserver?.unobserve(el);
  };
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    el.dataset.reveal = "pending";
    return observe(el, () => {
      el.dataset.reveal = "in";
    });
  }, []);
  return ref;
}

type RevealProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Stagger index — each step delays the animation by 80 ms. */
  delay?: number;
  id?: string;
};

/** Fade + slide-up block reveal. */
export function Reveal({ as = "div", children, className, delay = 0, id }: RevealProps) {
  const ref = useReveal<HTMLElement>();
  return createElement(
    as,
    { ref, id, className: cn("reveal-item", className), style: { "--reveal-i": delay } as CSSProperties },
    children,
  );
}

type RevealTextProps = {
  as?: ElementType;
  text: string;
  className?: string;
  /** Words to render with the amber→silver gradient (exact match, case-sensitive). */
  highlight?: string[];
};

/** Heading whose words slide up from a mask, line by line. */
export function RevealText({ as = "h2", text, className, highlight = [] }: RevealTextProps) {
  const ref = useReveal<HTMLElement>();
  const words = text.split(/\s+/).filter(Boolean);
  return createElement(
    as,
    { ref, className },
    // The space must sit BETWEEN the masks: trailing whitespace inside an
    // inline-block is collapsed, which would glue the words together.
    words.map((word, i) => (
      <Fragment key={`${word}-${i}`}>
        <span className="reveal-word-mask">
          <span
            className={cn("reveal-word", highlight.includes(word.replace(/[.,!?]$/, "")) && "text-gradient")}
            style={{ "--reveal-i": i } as CSSProperties}
          >
            {word}
          </span>
        </span>
        {i < words.length - 1 ? " " : null}
      </Fragment>
    )),
  );
}
