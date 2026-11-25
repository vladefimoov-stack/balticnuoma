"use client";

import {
  CalendarRange,
  Car,
  ExternalLink,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Tags,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { signOut } from "@/lib/admin/session-actions";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean; badge?: "pending" };

const NAV: NavItem[] = [
  { href: "/admin", label: "Apžvalga", icon: LayoutDashboard },
  { href: "/admin/rezervacijos", label: "Rezervacijos", icon: Inbox, badge: "pending" },
  { href: "/admin/kalendorius", label: "Kalendorius", icon: CalendarRange },
  { href: "/admin/automobiliai", label: "Automobiliai", icon: Car },
  { href: "/admin/kategorijos", label: "Kategorijos", icon: Tags },
  { href: "/admin/nustatymai", label: "Nustatymai", icon: Settings, adminOnly: true },
];

type Props = {
  user: { name: string; role: "admin" | "manager" };
  pendingCount: number;
  children: ReactNode;
};

/** Admin frame: sidebar on desktop, top bar + slide-over menu on phones. */
export function AdminShell({ user, pendingCount, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const items = NAV.filter((item) => !item.adminOnly || user.role === "admin");
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const nav = (
    <nav aria-label="Administravimo meniu" className="flex flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
            isActive(item.href) ? "bg-amber/12 text-amber" : "text-muted hover:bg-white/[0.04] hover:text-fg",
          )}
        >
          <item.icon className="size-[18px] shrink-0" aria-hidden />
          <span className="flex-1">{item.label}</span>
          {item.badge === "pending" && pendingCount > 0 && (
            <span
              className="grid h-5 min-w-5 place-items-center rounded-pill bg-pending px-1.5 text-[0.7rem] font-bold text-on-amber"
              aria-label={`${pendingCount} naujos užklausos`}
            >
              {pendingCount}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:text-fg"
      >
        <ExternalLink className="size-4" aria-hidden />
        Atidaryti svetainę
      </a>
      <div className="flex items-center justify-between gap-3 px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted">{user.role === "admin" ? "Administratorius" : "Vadybininkas"}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            aria-label="Atsijungti"
            title="Atsijungti"
            className="grid size-10 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-busy/50 hover:text-busy"
          >
            <LogOut className="size-4" aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15.5rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface/60 p-4 lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-3 pt-2">
          <LogoMark className="size-8" />
          <span className="text-sm leading-tight font-semibold">
            Baltic Nuoma
            <span className="block text-xs font-normal text-muted">Administravimas</span>
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        {footer}
      </aside>

      {/* Phone top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-line bg-bg/85 px-4 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="text-sm font-semibold">Administravimas</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Atidaryti meniu"
          aria-expanded={open}
          className="relative grid size-10 place-items-center rounded-xl border border-line"
        >
          <Menu className="size-5" aria-hidden />
          {pendingCount > 0 && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-pending" aria-hidden />}
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Meniu">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Uždaryti meniu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,85vw)] flex-col gap-6 border-l border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <span className="px-3 text-sm font-semibold">Meniu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Uždaryti meniu"
                className="grid size-10 place-items-center rounded-xl border border-line"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{nav}</div>
            {footer}
          </div>
        </div>
      )}

      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
