"use client";

import { AlertTriangle, CheckCircle2, Loader2, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/admin/booking-actions";
import { createManualBooking, previewManualBooking, type ManualPreview } from "@/lib/admin/manual-booking-actions";
import type { Selection } from "@/lib/booking/schema";
import { addDaysIso } from "@/lib/dates";
import { cn } from "@/lib/utils/cn";
import { adminInput, adminLabel, Card, CardTitle, Notice } from "./ui";

type CarOption = { id: string; title: string; plate: string | null; status: string };

type Props = {
  cars: CarOption[];
  defaults: { carId: string; from: string; to: string };
  emailsEnabled: boolean;
};

const RENTAL_LABEL = { hourly: "Valandinė", daily: "Paros", weekly: "Savaitės", long_term: "Ilgalaikė" } as const;
const QUOTE_PROBLEM: Record<string, string> = {
  not_available: "šiam automobiliui toks nuomos būdas netaikomas",
  min_days: "trumpesnė nei mažiausias nuomos laikotarpis",
  min_hours: "mažiau valandų nei leidžiama",
  too_long: "per ilgas laikotarpis",
};
const money = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(2)} €`;
const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function ManualBookingForm({ cars, defaults, emailsEnabled }: Props) {
  const [carId, setCarId] = useState(defaults.carId);
  const [mode, setMode] = useState<"days" | "hourly">("days");
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [startHour, setStartHour] = useState(10);
  const [hours, setHours] = useState(3);
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", phone: "", email: "", licenseYear: "" });
  const [locale, setLocale] = useState<"lt" | "en">("lt");
  const [comment, setComment] = useState("");
  const [managerNote, setManagerNote] = useState("");
  const [status, setStatus] = useState<"confirmed" | "pending">("confirmed");
  const [total, setTotal] = useState("");
  const [deposit, setDeposit] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [preview, setPreview] = useState<ManualPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  const selection: Selection = useMemo(
    () =>
      mode === "days"
        ? { mode: "days", startDate: from, endDate: to < from ? from : to }
        : { mode: "hourly", date: from, startHour, hours },
    [mode, from, to, startHour, hours],
  );

  // Live price + availability (debounced).
  useEffect(() => {
    if (!carId || !from) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setPreviewing(true);
      const res = await previewManualBooking({ carId, selection });
      if (!cancelled) {
        setPreview(res);
        setPreviewing(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [carId, selection, from]);

  const quote = preview?.ok && preview.quote.ok ? preview.quote.quote : null;
  const taken = preview?.ok ? preview.conflicts.filter((c) => c.kind !== "request") : [];
  const requests = preview?.ok ? preview.conflicts.filter((c) => c.kind === "request") : [];
  const canEmail = emailsEnabled && status === "confirmed" && customer.email.trim() !== "";

  const submit = () =>
    start(async () => {
      setResult(null);
      const res = await createManualBooking({
        carId,
        selection,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone,
        email: customer.email,
        licenseYear: num(customer.licenseYear),
        locale,
        comment,
        managerNote,
        status,
        total: num(total),
        deposit: num(deposit),
        sendEmail: canEmail && sendEmail,
      });
      // On success the action redirects to the new booking's card.
      if (res && !res.ok) setResult(res);
    });

  const field = (
    key: keyof typeof customer,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className={adminLabel}>{label}</span>
      <input
        value={customer[key]}
        onChange={(e) => setCustomer({ ...customer, [key]: e.target.value })}
        className={adminInput}
        {...props}
      />
    </label>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="grid gap-5 lg:grid-cols-[1fr_22rem]"
    >
      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardTitle>Automobilis ir laikas</CardTitle>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={adminLabel}>Automobilis *</span>
              <select value={carId} onChange={(e) => setCarId(e.target.value)} className={adminInput} required>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                    {c.plate ? ` · ${c.plate}` : ""}
                    {c.status !== "published" ? " (nerodomas svetainėje)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <div
              role="radiogroup"
              aria-label="Nuomos būdas"
              className="grid max-w-sm grid-cols-2 gap-1 rounded-pill border border-line bg-bg/60 p-1"
            >
              {(["days", "hourly"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "h-9 rounded-pill text-sm font-semibold transition-colors",
                    mode === m ? "bg-amber text-on-amber" : "text-muted hover:text-fg",
                  )}
                >
                  {m === "days" ? "Paromis" : "Valandomis"}
                </button>
              ))}
            </div>

            {mode === "days" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className={adminLabel}>Pirma diena *</span>
                  <input
                    type="date"
                    required
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      if (to < e.target.value) setTo(e.target.value);
                    }}
                    className={adminInput}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={adminLabel}>Paskutinė diena (imtinai) *</span>
                  <input
                    type="date"
                    required
                    min={from}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className={adminInput}
                  />
                </label>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5">
                  <span className={adminLabel}>Data *</span>
                  <input
                    type="date"
                    required
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className={adminInput}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={adminLabel}>Pradžia</span>
                  <select
                    value={startHour}
                    onChange={(e) => {
                      const h = Number(e.target.value);
                      setStartHour(h);
                      if (h + hours > 24) setHours(24 - h);
                    }}
                    className={adminInput}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={adminLabel}>Trukmė</span>
                  <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={adminInput}>
                    {Array.from({ length: 24 - startHour }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} val. (iki {String(startHour + n).padStart(2, "0")}:00)
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {mode === "days" && (
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 7, 14, 28].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setTo(addDaysIso(from, d - 1))}
                    className="rounded-pill border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:border-amber/50 hover:text-fg"
                  >
                    {d === 1 ? "1 para" : d < 10 ? `${d} paros` : `${d} parų`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Klientas</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("firstName", "Vardas *", { required: true, autoComplete: "off" })}
            {field("lastName", "Pavardė *", { required: true, autoComplete: "off" })}
            {field("phone", "Telefonas *", {
              required: true,
              type: "tel",
              inputMode: "tel",
              placeholder: "+370 600 00000",
            })}
            {field("email", "El. paštas (neprivaloma)", { type: "email", inputMode: "email" })}
            {field("licenseYear", "Pažymėjimo gavimo metai (neprivaloma)", {
              type: "number",
              inputMode: "numeric",
              min: 1940,
              max: new Date().getFullYear(),
            })}
            <label className="flex flex-col gap-1.5">
              <span className={adminLabel}>Laiškų kalba</span>
              <select value={locale} onChange={(e) => setLocale(e.target.value as "lt" | "en")} className={adminInput}>
                <option value="lt">Lietuvių</option>
                <option value="en">Anglų</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={adminLabel}>Kliento pageidavimai (neprivaloma)</span>
              <textarea
                value={comment}
                maxLength={1000}
                rows={2}
                onChange={(e) => setComment(e.target.value)}
                className={`${adminInput} h-auto py-2.5`}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className={adminLabel}>Vadybininko pastaba (matoma tik administravime)</span>
              <textarea
                value={managerNote}
                maxLength={2000}
                rows={2}
                placeholder="Pvz.: skambino dėl skelbimo, perdavimas 10:00 biure"
                onChange={(e) => setManagerNote(e.target.value)}
                className={`${adminInput} h-auto py-2.5`}
              />
            </label>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        <Card className="lg:sticky lg:top-6">
          <CardTitle
            aside={previewing ? <Loader2 className="size-4 animate-spin text-muted" aria-label="Skaičiuojama" /> : null}
          >
            Kaina ir užimtumas
          </CardTitle>
          <div className="flex flex-col gap-4" aria-live="polite">
            {preview && !preview.ok && <Notice tone="warning">{preview.error}</Notice>}
            {preview?.ok && (
              <>
                {taken.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-busy/35 bg-busy/10 p-3 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-busy">
                      <AlertTriangle className="size-4" aria-hidden /> Datos užimtos
                    </p>
                    {taken.map((c, i) => (
                      <p key={i}>
                        {c.href ? (
                          <Link href={c.href} className="underline">
                            {c.kind === "block" ? `Blokuota: ${c.label}` : c.label}
                          </Link>
                        ) : (
                          c.label
                        )}
                        <span className="block text-xs text-muted">{c.period}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-free">
                    <CheckCircle2 className="size-4" aria-hidden /> Datos laisvos
                  </p>
                )}
                {requests.length > 0 && (
                  <div className="flex flex-col gap-1.5 rounded-xl border border-pending/35 bg-pending/10 p-3 text-sm">
                    <p className="flex items-center gap-2 font-semibold text-pending">
                      <Users className="size-4" aria-hidden /> Užklausos šioms datoms ({requests.length})
                    </p>
                    {requests.map((c, i) => (
                      <Link key={i} href={c.href ?? "#"} className="underline">
                        {c.label}
                      </Link>
                    ))}
                    <span className="text-xs text-muted">
                      Patvirtinus šią rezervaciją, jas galėsite atmesti vienu mygtuku.
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
                  {quote ? (
                    <>
                      <p className="flex justify-between">
                        <span className="text-muted">Tarifas</span>
                        <span>{RENTAL_LABEL[quote.rentalType]}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-muted">Kaina pagal tarifus</span>
                        <span className="font-display text-lg font-semibold">{money(quote.total)}</span>
                      </p>
                    </>
                  ) : (
                    preview.quote.ok === false && (
                      <p className="text-pending">
                        Pagal tarifus apskaičiuoti negalima:{" "}
                        {QUOTE_PROBLEM[preview.quote.reason] ?? preview.quote.reason}. Įveskite kainą žemiau.
                      </p>
                    )
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={adminLabel}>Kaina, €</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={total}
                  placeholder={quote ? String(quote.total) : ""}
                  onChange={(e) => setTotal(e.target.value)}
                  className={adminInput}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={adminLabel}>Užstatas, €</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  value={deposit}
                  placeholder={preview?.ok ? String(preview.deposit) : ""}
                  onChange={(e) => setDeposit(e.target.value)}
                  className={adminInput}
                />
              </label>
            </div>
            <p className="-mt-2 text-xs text-muted">Tuščia — pagal tarifus. Įrašykite, jei sutarėte kitą kainą.</p>

            <fieldset className="flex flex-col gap-2">
              <legend className={cn(adminLabel, "mb-2")}>Būsena</legend>
              {(
                [
                  ["confirmed", "Patvirtinta", "Datos iš karto užimamos (rodomos raudonai)."],
                  ["pending", "Laukia patvirtinimo", "Datos neužimamos — kaip užklausa iš svetainės."],
                ] as const
              ).map(([value, label, help]) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl border p-3",
                    status === value ? "border-amber/60 bg-amber/8" : "border-line",
                  )}
                >
                  <input
                    type="radio"
                    name="status"
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="mt-0.5 size-4 accent-amber"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-xs text-muted">{help}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className={cn("flex items-start gap-3 text-sm", !canEmail && "opacity-50")}>
              <input
                type="checkbox"
                checked={canEmail && sendEmail}
                disabled={!canEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="mt-0.5 size-4 accent-amber"
              />
              <span>
                Siųsti klientui patvirtinimo laišką
                {!emailsEnabled && <span className="block text-xs text-muted">El. paštas dar nesukonfigūruotas.</span>}
                {emailsEnabled && !customer.email.trim() && (
                  <span className="block text-xs text-muted">Įveskite kliento el. paštą.</span>
                )}
              </span>
            </label>

            {result && !result.ok && <Notice tone="error">{result.error}</Notice>}

            <Button type="submit" disabled={pending || (status === "confirmed" && taken.length > 0)} className="w-full">
              {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {status === "confirmed" ? "Sukurti patvirtintą rezervaciją" : "Sukurti užklausą"}
            </Button>
          </div>
        </Card>
      </div>
    </form>
  );
}
