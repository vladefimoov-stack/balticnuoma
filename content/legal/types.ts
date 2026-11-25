import type { ReactNode } from "react";
import type { LegalContext } from "@/lib/legal/context";

export type LegalSection = { id: string; title: string; body: ReactNode };

/** One legal document in one language: context → numbered sections. */
export type LegalDocument = (ctx: LegalContext) => LegalSection[];
