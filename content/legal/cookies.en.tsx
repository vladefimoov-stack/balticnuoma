/* ЧЕРНОВИК: требует юридической проверки — draft cookie policy (EN). The LT version prevails. */
import { CookieSettingsButton } from "@/components/consent/CookieBanner";
import { buttonClasses } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { CONSENT_COOKIE } from "@/lib/consent";
import type { LegalDocument } from "./types";
import { CookieTable, Email, External, type CookieRow } from "./ui";

const cookies: LegalDocument = (ctx) => {
  const rows: CookieRow[] = [
    {
      name: "NEXT_LOCALE",
      provider: "This website",
      purpose: "Remembers the website language you chose.",
      duration: "Until the browser is closed",
      category: "Necessary",
    },
    {
      name: CONSENT_COOKIE,
      provider: "This website",
      purpose: "Remembers your cookie choice.",
      duration: "12 months",
      category: "Necessary",
    },
    {
      name: "sb-…-auth-token",
      provider: "This website",
      purpose: "Staff sign-in to the admin system (set for staff only).",
      duration: "Until sign-out, max. 400 days",
      category: "Necessary",
    },
    {
      name: "NID, AEC, SOCS, etc.",
      provider: "Google",
      purpose: "Google Maps map functionality, preferences and security.",
      duration: "Up to 13 months",
      category: "Map — with consent only",
    },
    ...(ctx.analytics
      ? [
          {
            name: "_ga, _ga_*",
            provider: "Google",
            purpose: "Google Analytics: counting visitors and visits.",
            duration: "Up to 2 years",
            category: "Analytics — with consent only",
          },
        ]
      : []),
  ];

  return [
    {
      id: "what-are-cookies",
      title: "What cookies are",
      body: (
        <p>
          Cookies are small text files a website stores in your browser. They help the website work (e.g. remember your
          language) or, with your consent, load third-party content and collect statistics.
        </p>
      ),
    },
    {
      id: "cookies-we-use",
      title: "Cookies we use",
      body: (
        <>
          <p>
            <strong>Necessary cookies</strong> are required for the website to work, so they don’t need consent.{" "}
            <strong>Other cookies</strong> are set only with your consent.
          </p>
          <CookieTable
            label="Table of cookies we use"
            head={{
              name: "Cookie",
              provider: "Provider",
              purpose: "Purpose",
              duration: "Expiry",
              category: "Category",
            }}
            rows={rows}
          />
          {!ctx.analytics && (
            <p>
              We currently don’t use analytics or advertising cookies. If we start, we’ll update this policy and ask for
              your consent.
            </p>
          )}
        </>
      ),
    },
    {
      id: "managing-consent",
      title: "Managing your consent",
      body: (
        <>
          <p>
            On your first visit a notice lets you accept all cookies, keep only the necessary ones or choose categories.
            Until you choose, no optional cookies are set. You can change your choice at any time:
          </p>
          <p>
            <CookieSettingsButton className={buttonClasses({ variant: "secondary", size: "sm" })} />
          </p>
          <p>
            You can also delete or block cookies in your browser settings. If you block necessary cookies, parts of the
            website may not work.
          </p>
        </>
      ),
    },
    {
      id: "third-party-cookies",
      title: "Third-party cookies",
      body: (
        <p>
          Google cookies are handled by Google under its own rules — see{" "}
          <External href="https://policies.google.com/technologies/cookies">How Google uses cookies</External> and the{" "}
          <External href="https://policies.google.com/privacy">Google Privacy Policy</External>. How we process personal
          data is described in our <Link href="/privatumo-politika">privacy policy</Link>.
        </p>
      ),
    },
    {
      id: "contacts",
      title: "Contacts and changes",
      body: (
        <p>
          Send questions about cookies to <Email value={ctx.privacyEmail} />. We may update this policy — the new
          version is published on this page.
        </p>
      ),
    },
  ];
};

export default cookies;
