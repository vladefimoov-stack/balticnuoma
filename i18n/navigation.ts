import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Locale-aware wrappers around Next.js navigation APIs. Always import these
 *  instead of `next/link` / `next/navigation` inside the public site. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
