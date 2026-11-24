import { Manrope, Unbounded } from "next/font/google";

/* `latin-ext` is required for Lithuanian: ą č ę ė į š ų ū ž. */

export const fontDisplay = Unbounded({
  subsets: ["latin", "latin-ext"],
  variable: "--font-unbounded",
  display: "swap",
});

export const fontSans = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

export const fontVariables = `${fontDisplay.variable} ${fontSans.variable}`;
