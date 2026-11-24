import type { ReactNode } from "react";
import "./globals.css";

/**
 * The real root layouts are `app/[locale]/layout.tsx` (public site) and
 * `app/admin/layout.tsx` (admin). This pass-through exists because
 * `app/not-found.tsx` requires a root layout.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
