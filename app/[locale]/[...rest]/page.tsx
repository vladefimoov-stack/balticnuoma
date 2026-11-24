import { notFound } from "next/navigation";

/** Catch-all so unknown localized URLs render the styled `[locale]/not-found.tsx`. */
export default function CatchAllPage() {
  notFound();
}
