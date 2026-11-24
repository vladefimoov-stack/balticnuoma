import type { StaticPathname } from "@/i18n/routing";

export type NavKey = "cars" | "terms" | "contacts";

export const navItems: ReadonlyArray<{ href: StaticPathname; key: NavKey }> = [
  { href: "/automobiliai", key: "cars" },
  { href: "/salygos", key: "terms" },
  { href: "/kontaktai", key: "contacts" },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
