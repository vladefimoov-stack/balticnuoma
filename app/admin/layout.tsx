import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVariables } from "@/lib/fonts";

/** Admin panel root: Lithuanian only, never indexed, always dynamic (session cookies). */
export const metadata: Metadata = {
  title: { default: "Administravimas", template: "%s · Baltic Nuoma administravimas" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0A0B0D",
  colorScheme: "dark",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="lt" className={fontVariables}>
      <body className="min-h-dvh bg-bg text-fg antialiased">{children}</body>
    </html>
  );
}
