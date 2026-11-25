import type { ReactNode } from "react";

/** Small helpers for the legal texts. Placeholders ("[…]") render as plain text, not links. */

export function Email({ value }: { value: string }) {
  if (value.startsWith("[")) return <Missing>{value}</Missing>;
  return <a href={`mailto:${value}`}>{value}</a>;
}

export function Phone({ display, e164 }: { display: string; e164: string }) {
  return <a href={`tel:${e164}`}>{display}</a>;
}

export function External({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

/** A requisite the owner hasn't filled in yet (admin → Nustatymai → Įmonės rekvizitai). */
export function Missing({ children }: { children: ReactNode }) {
  return <span className="text-amber">{children}</span>;
}

/** Renders a requisite, highlighting it when it's still a placeholder. */
export function Req({ value }: { value: string }) {
  return value.startsWith("[") ? <Missing>{value}</Missing> : <>{value}</>;
}

export type CookieRow = { name: string; provider: string; purpose: string; duration: string; category: string };

/** Cookie inventory table (scrolls sideways on narrow screens instead of squashing). */
export function CookieTable({ head, rows }: { head: CookieRow; rows: CookieRow[] }) {
  const cols = ["name", "provider", "purpose", "duration", "category"] as const;
  return (
    <div className="legal-table mt-4 overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[42rem] border-collapse text-left text-sm">
        <thead className="bg-surface text-xs tracking-wide text-fg uppercase">
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col" className="px-4 py-3 font-semibold">
                {head[c]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-line align-top">
              {cols.map((c) =>
                c === "name" ? (
                  <th key={c} scope="row" className="px-4 py-3 font-mono text-xs font-medium text-fg">
                    {row[c]}
                  </th>
                ) : (
                  <td key={c} className="px-4 py-3">
                    {row[c]}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
