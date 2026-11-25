"use client";

import { ArrowLeft, Loader2, Phone, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useForm, type Resolver } from "react-hook-form";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { submitBooking } from "@/lib/booking/actions";
import {
  dayStatus,
  freeStartHours,
  HOURLY_FIRST_START,
  HOURLY_LAST_END,
  type Interval,
} from "@/lib/booking/availability";
import { formatPrice, formatSelection } from "@/lib/booking/format";
import type { BookingErrorCode, Customer, CustomerField, CustomerInput, Selection } from "@/lib/booking/schema";
import { BOOKING_HORIZON_DAYS, quoteSelection } from "@/lib/booking/selection";
import { addDaysIso, vilniusToday } from "@/lib/dates";
import type { Pricing, RentalRules } from "@/lib/db/json";
import { availableModes, type QuoteResult } from "@/lib/pricing/calculate";
import { getLenis } from "@/lib/motion/lenis";
import { cn } from "@/lib/utils/cn";
import { BookingCalendar } from "./BookingCalendar";
import { SuccessDialog, type BookingSuccess } from "./SuccessDialog";

type Props = {
  locale: "lt" | "en";
  car: { id: string; pricing: Pricing; rules: RentalRules; deposit: number };
  contacts: { phone: string; phoneE164: string; whatsappUrl: string };
};

type Mode = "days" | "hourly";
type Step = "select" | "form";
type Problem = { code: BookingErrorCode | "network"; min?: number; max?: number };

const MAX_HOURLY_OPTIONS = 12;
const ERROR_KEYS = ["required", "tooLong", "phone", "email", "licenseYear", "confirm", "consent", "date"] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];
const isErrorKey = (key: unknown): key is ErrorKey => ERROR_KEYS.includes(key as ErrorKey);

const TARIFF_KEY = { hourly: "hourly", daily: "daily", weekly: "weekly", long_term: "longTerm" } as const;

// "Today" only exists in the browser: the page is static (ISR) and may be older than today.
const noop = () => () => {};
/** zod + the customer schema (~90 KB) aren't needed until the form is used — load them then. */
const loadValidation = () => Promise.all([import("@hookform/resolvers/zod"), import("@/lib/booking/schema")]);

const customerResolver: Resolver<CustomerInput, unknown, Customer> = async (values, context, options) => {
  const [{ zodResolver }, { customerSchema }] = await loadValidation();
  return zodResolver(customerSchema)(values, context, options);
};

function useVilniusToday() {
  return useSyncExternalStore(
    noop,
    () => vilniusToday(),
    () => null,
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-line-strong bg-bg/60 px-4 text-[0.95rem] text-fg [color-scheme:dark] transition-colors placeholder:text-muted/60 hover:border-white/25 focus:border-amber focus:outline-none aria-[invalid=true]:border-busy/80";

export function BookingWidget({ locale, car, contacts }: Props) {
  const t = useTranslations("booking");
  const tt = useTranslations("tariffs");
  const today = useVilniusToday();
  const maxDate = today ? addDaysIso(today, BOOKING_HORIZON_DAYS) : null;
  const modes = availableModes(car.pricing, car.rules);

  const [mode, setMode] = useState<Mode>(modes.days ? "days" : "hourly");
  const [step, setStep] = useState<Step>("select");
  const [busy, setBusy] = useState<Interval[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [range, setRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [rangeError, setRangeError] = useState(false);
  const [hourly, setHourly] = useState<{ date: string | null; hours: number; startHour: number | null }>({
    date: null,
    hours: car.pricing.hourly.min_hours,
    startHour: null,
  });
  const [problem, setProblem] = useState<Problem | null>(null);
  const [result, setResult] = useState<BookingSuccess | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // ── Availability ──────────────────────────────────────────────────────────
  const loadBusy = useCallback(async () => {
    if (!today || !maxDate) return;
    setLoadFailed(false);
    try {
      const res = await fetch(`/api/busy?car=${car.id}&from=${today}&to=${maxDate}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { busy: [number, number][] };
      setBusy(json.busy.map(([start, end]) => ({ start, end })));
    } catch {
      setLoadFailed(true);
    }
  }, [car.id, today, maxDate]);

  useEffect(() => {
    void loadBusy();
  }, [loadBusy]);

  const statusOf = useMemo(() => (busy ? (date: string) => dayStatus(date, busy) : null), [busy]);

  // ── Selection ─────────────────────────────────────────────────────────────
  const hourOptions = useMemo(() => {
    const min = car.pricing.hourly.min_hours;
    const max = Math.min(MAX_HOURLY_OPTIONS, HOURLY_LAST_END - HOURLY_FIRST_START);
    return Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
  }, [car.pricing.hourly.min_hours]);

  const freeHours = useMemo(
    () => (busy && hourly.date ? freeStartHours(hourly.date, hourly.hours, busy) : []),
    [busy, hourly.date, hourly.hours],
  );

  const selection: Selection | null =
    mode === "days"
      ? range.start && range.end
        ? { mode: "days", startDate: range.start, endDate: range.end }
        : null
      : hourly.date && hourly.startHour !== null
        ? { mode: "hourly", date: hourly.date, startHour: hourly.startHour, hours: hourly.hours }
        : null;

  const quote: QuoteResult | null = selection ? quoteSelection(car.pricing, car.rules, selection) : null;

  function isSelectable(date: string) {
    if (!statusOf || !busy) return false;
    const status = statusOf(date);
    if (mode === "days") return status === "free";
    return status !== "busy" && freeStartHours(date, car.pricing.hourly.min_hours, busy).length > 0;
  }

  function selectDay(date: string) {
    setProblem(null);
    if (mode === "hourly") {
      setHourly((h) => ({ ...h, date, startHour: null }));
      return;
    }
    setRangeError(false);
    if (!range.start || range.end || date < range.start) {
      setRange({ start: date, end: null });
      return;
    }
    // Every day of a multi-day rental must be completely free.
    for (let d = range.start; d <= date; d = addDaysIso(d, 1)) {
      if (statusOf?.(d) !== "free") {
        setRangeError(true);
        setRange({ start: date, end: null });
        return;
      }
    }
    setRange({ start: range.start, end: date });
  }

  function switchMode(next: Mode) {
    setMode(next);
    setProblem(null);
    setRangeError(false);
  }

  function scrollToWidget() {
    const el = rootRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top >= 0 && top < window.innerHeight / 3) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(el, { offset: -100 });
    else el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToForm() {
    void loadValidation(); // warm up while the visitor reads the form
    setStep("form");
    setProblem(null);
    requestAnimationFrame(() => {
      scrollToWidget();
      rootRef.current?.querySelector<HTMLElement>("[data-step-title]")?.focus({ preventScroll: true });
    });
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  const currentYear = new Date().getFullYear();
  const licenseYears = Array.from({ length: 60 }, (_, i) => currentYear - car.rules.min_license_years - i);

  const form = useForm<CustomerInput, unknown, Customer>({
    resolver: customerResolver,
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      licenseYear: Number.NaN,
      experienceConfirmed: false,
      comment: "",
      consent: false,
      website: "",
    },
  });
  const { register, handleSubmit, formState, setError } = form;
  const errors = formState.errors;

  const errorText = (field: CustomerField) => {
    const message = errors[field]?.message;
    return isErrorKey(message) ? t(`errors.${message}`) : message ? t("problems.invalid") : null;
  };

  const onSubmit = handleSubmit(async (customer) => {
    if (!selection) return;
    setProblem(null);
    try {
      const res = await submitBooking({ carId: car.id, locale, selection, customer, startedAt: startedAt.current });
      if (res.ok) {
        // A request does not hold the dates, so the calendar stays as it is (refreshed in
        // case staff confirmed something meanwhile); the confirmation opens as a popup.
        setResult({ number: res.number, email: res.emailed ? customer.email : null });
        setStep("select");
        form.reset();
        setRange({ start: null, end: null });
        setHourly((h) => ({ ...h, date: null, startHour: null }));
        void loadBusy();
        return;
      }
      if (res.fields) {
        for (const [field, message] of Object.entries(res.fields)) {
          setError(field as CustomerField, { message });
        }
      }
      setProblem({ code: res.error, min: res.min, max: res.max });
      if (res.error === "period_unavailable") void loadBusy();
    } catch {
      setProblem({ code: "network" });
    }
  });

  function problemText(p: Problem) {
    switch (p.code) {
      case "min_days":
        return t("problems.min_days", { min: p.min ?? 1 });
      case "min_hours":
        return t("problems.min_hours", { min: p.min ?? car.pricing.hourly.min_hours });
      case "too_long":
        return t("problems.too_long", { max: p.max ?? 365 });
      case "license":
        return t("problems.license", { min: p.min ?? car.rules.min_license_years });
      default:
        return t(`problems.${p.code}`);
    }
  }

  const price = (n: number) => formatPrice(n, locale);
  const periodBack = problem && ["period_unavailable", "past", "min_days", "min_hours"].includes(problem.code);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <section
      ref={rootRef}
      id="rezervacija"
      aria-labelledby="booking-title"
      className="relative scroll-mt-28 rounded-card border border-amber/25 bg-surface p-5 sm:p-6"
    >
      <>
        <div className="flex flex-col gap-1.5">
          <h2
            id="booking-title"
            data-step-title={step === "form" ? undefined : ""}
            tabIndex={-1}
            className="font-display text-xl font-semibold outline-none"
          >
            {t("title")}
          </h2>
          {step === "select" && <p className="text-sm text-muted">{t("intro")}</p>}
        </div>

        {step === "select" && (
          <div className="mt-5 flex flex-col gap-5">
            {modes.days && modes.hourly && (
              <div
                role="radiogroup"
                aria-label={t("modeLabel")}
                className="grid grid-cols-2 gap-1 rounded-pill border border-line bg-bg/60 p-1"
              >
                {(["days", "hourly"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => switchMode(m)}
                    className={cn(
                      "h-9 rounded-pill text-sm font-semibold transition-colors",
                      mode === m ? "bg-amber text-on-amber" : "text-muted hover:text-fg",
                    )}
                  >
                    {m === "days" ? t("modeDays") : t("modeHourly")}
                  </button>
                ))}
              </div>
            )}

            {today && maxDate ? (
              <BookingCalendar
                key={mode}
                locale={locale}
                minDate={today}
                maxDate={maxDate}
                statusOf={statusOf}
                isSelectable={isSelectable}
                start={mode === "days" ? range.start : hourly.date}
                end={mode === "days" ? range.end : null}
                rangePreview={mode === "days"}
                onSelect={selectDay}
              />
            ) : (
              <div className="h-[22rem] animate-pulse rounded-xl bg-white/[0.03]" aria-hidden />
            )}

            <Legend hourly={modes.hourly} />

            {loadFailed && (
              <p className="flex flex-wrap items-center gap-3 text-sm text-busy" role="alert">
                {t("calendar.loadError")}
                <button
                  type="button"
                  onClick={() => void loadBusy()}
                  className="inline-flex items-center gap-1.5 text-fg underline"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  {t("calendar.retry")}
                </button>
              </p>
            )}

            <p className="text-sm text-muted empty:hidden" aria-live="polite">
              {rangeError ? (
                <span className="text-busy" role="alert">
                  {t("rangeBusy")}
                </span>
              ) : mode === "days" ? (
                !range.start ? (
                  t("hintStart")
                ) : !range.end ? (
                  t("hintEnd")
                ) : null
              ) : !hourly.date ? (
                t("hintDay")
              ) : null}
            </p>

            {mode === "hourly" && hourly.date && (
              <div className="flex flex-col gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-sm text-muted">{t("hoursCount")}</span>
                  <select
                    className={inputClass}
                    value={hourly.hours}
                    onChange={(e) => setHourly((h) => ({ ...h, hours: Number(e.target.value), startHour: null }))}
                  >
                    {hourOptions.map((n) => (
                      <option key={n} value={n}>
                        {t("hoursOption", { count: n })}
                      </option>
                    ))}
                  </select>
                </label>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 text-sm text-muted">{t("freeSlots")}</legend>
                  {freeHours.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {freeHours.map((h) => (
                        <button
                          key={h}
                          type="button"
                          aria-pressed={hourly.startHour === h}
                          onClick={() => setHourly((s) => ({ ...s, startHour: h }))}
                          className={cn(
                            "h-10 rounded-lg border text-sm tabular-nums transition-colors",
                            hourly.startHour === h
                              ? "border-amber bg-amber font-semibold text-on-amber"
                              : "border-line bg-free/10 hover:border-amber/60",
                          )}
                        >
                          {String(h).padStart(2, "0")}:00
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-busy">{t("noSlots")}</p>
                  )}
                </fieldset>
              </div>
            )}

            {selection && quote && (
              <QuoteSummary
                period={formatSelection(selection, locale)}
                quote={quote}
                deposit={car.deposit}
                price={price}
                problem={quote.ok ? null : problemText({ code: quote.reason, min: quote.min, max: quote.max })}
                labels={{
                  period: t("period"),
                  tariff: t("tariff"),
                  total: t("total"),
                  deposit: t("deposit"),
                  tariffName: quote.ok ? tt(TARIFF_KEY[quote.quote.rentalType]) : "",
                  lines: quote.ok
                    ? quote.quote.lines.map((line) =>
                        t(`lines.${line.kind}`, { count: line.quantity, price: price(line.unitPrice) }),
                      )
                    : [],
                }}
              />
            )}

            {problem && (
              <p className="rounded-xl border border-busy/30 bg-busy/10 px-4 py-3 text-sm text-fg" role="alert">
                {problemText(problem)}
              </p>
            )}

            <Button type="button" size="lg" disabled={!quote?.ok} onClick={goToForm} className="w-full">
              {t("continue")}
            </Button>
          </div>
        )}

        {step === "form" && selection && quote?.ok && (
          <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-5">
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-bg/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{formatSelection(selection, locale)}</span>
                  <span className="text-xs text-muted">
                    {selection.mode === "days"
                      ? t("duration.days", { count: quote.quote.days ?? 0 })
                      : t("duration.hours", { count: selection.hours })}{" "}
                    · {tt(TARIFF_KEY[quote.quote.rentalType])}
                  </span>
                </div>
                <span className="font-display text-lg font-semibold whitespace-nowrap">{price(quote.quote.total)}</span>
              </div>
              <p className="text-xs text-muted">
                {t("deposit")}: {price(car.deposit)}
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep("select");
                  setProblem(null);
                }}
                className="inline-flex items-center gap-1.5 self-start text-sm text-amber hover:text-amber-soft"
              >
                <ArrowLeft className="size-3.5" aria-hidden />
                {t("back")}
              </button>
            </div>

            <h3 data-step-title tabIndex={-1} className="font-display text-base font-semibold outline-none">
              {t("form.title")}
            </h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Field label={t("form.firstName")} error={errorText("firstName")} id="bk-first-name">
                <input
                  id="bk-first-name"
                  autoComplete="given-name"
                  className={inputClass}
                  aria-invalid={!!errors.firstName}
                  aria-describedby={errors.firstName ? "bk-first-name-error" : undefined}
                  {...register("firstName")}
                />
              </Field>
              <Field label={t("form.lastName")} error={errorText("lastName")} id="bk-last-name">
                <input
                  id="bk-last-name"
                  autoComplete="family-name"
                  className={inputClass}
                  aria-invalid={!!errors.lastName}
                  aria-describedby={errors.lastName ? "bk-last-name-error" : undefined}
                  {...register("lastName")}
                />
              </Field>
            </div>
            <Field label={t("form.phone")} error={errorText("phone")} id="bk-phone">
              <input
                id="bk-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t("form.phonePlaceholder")}
                className={inputClass}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "bk-phone-error" : undefined}
                {...register("phone")}
              />
            </Field>
            <Field label={t("form.email")} error={errorText("email")} id="bk-email">
              <input
                id="bk-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className={inputClass}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "bk-email-error" : undefined}
                {...register("email")}
              />
            </Field>
            <Field label={t("form.licenseYear")} error={errorText("licenseYear")} id="bk-license">
              <select
                id="bk-license"
                className={inputClass}
                aria-invalid={!!errors.licenseYear}
                aria-describedby={errors.licenseYear ? "bk-license-error" : undefined}
                {...register("licenseYear", { valueAsNumber: true })}
              >
                <option value="">{t("form.licenseYearPlaceholder")}</option>
                {licenseYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={
                <>
                  {t("form.comment")} <span className="text-muted/70">({t("form.optional")})</span>
                </>
              }
              error={errorText("comment")}
              id="bk-comment"
            >
              <textarea
                id="bk-comment"
                rows={3}
                placeholder={t("form.commentPlaceholder")}
                className={cn(inputClass, "h-auto min-h-24 py-3")}
                aria-invalid={!!errors.comment}
                aria-describedby={errors.comment ? "bk-comment-error" : undefined}
                {...register("comment")}
              />
            </Field>

            <Checkbox id="bk-experience" error={errorText("experienceConfirmed")} {...register("experienceConfirmed")}>
              {t("form.experience", { age: car.rules.min_age, years: car.rules.min_license_years })}
            </Checkbox>
            <Checkbox id="bk-consent" error={errorText("consent")} {...register("consent")}>
              {t.rich("form.consent", {
                terms: (chunks) => (
                  <Link href="/salygos" target="_blank" className="text-amber underline hover:text-amber-soft">
                    {chunks}
                  </Link>
                ),
                privacy: (chunks) => (
                  <Link
                    href="/privatumo-politika"
                    target="_blank"
                    className="text-amber underline hover:text-amber-soft"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </Checkbox>

            {/* Honeypot: invisible to people and screen readers, tempting for bots. */}
            <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden>
              <label htmlFor="bk-website">{t("form.honeypot")}</label>
              <input id="bk-website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>

            {problem && (
              <div
                className="flex flex-col gap-2 rounded-xl border border-busy/30 bg-busy/10 px-4 py-3 text-sm"
                role="alert"
              >
                <p>{problemText(problem)}</p>
                {periodBack && (
                  <button type="button" onClick={() => setStep("select")} className="self-start text-amber underline">
                    {t("back")}
                  </button>
                )}
              </div>
            )}

            <Button type="submit" size="lg" disabled={formState.isSubmitting} className="w-full">
              {formState.isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("form.submitting")}
                </>
              ) : (
                t("form.submit")
              )}
            </Button>
            <p className="text-xs leading-relaxed text-muted">{t("form.note")}</p>
          </form>
        )}
      </>

      <div className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
        <p className="text-xs text-muted">{t("contactAlt")}</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={contacts.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-pill border border-line px-4 text-xs font-semibold transition-colors hover:border-amber/60 hover:text-amber"
          >
            <WhatsAppIcon size={14} />
            WhatsApp
          </a>
          <a
            href={`tel:${contacts.phoneE164}`}
            className="inline-flex h-9 items-center gap-2 rounded-pill border border-line px-4 text-xs font-semibold transition-colors hover:border-amber/60 hover:text-amber"
          >
            <Phone className="size-3.5" aria-hidden />
            {contacts.phone}
          </a>
        </div>
      </div>
      <SuccessDialog
        result={result}
        onClose={() => {
          setResult(null);
          scrollToWidget();
          rootRef.current?.querySelector<HTMLElement>("#booking-title")?.focus({ preventScroll: true });
        }}
      />
    </section>
  );
}

function Legend({ hourly }: { hourly: boolean }) {
  const t = useTranslations("booking.legend");
  const items: { key: "free" | "busy" | "partial" | "selected"; className: string }[] = [
    { key: "free", className: "bg-free/40" },
    { key: "busy", className: "bg-busy/60" },
    ...(hourly ? [{ key: "partial" as const, className: "calendar-partial" }] : []),
    { key: "selected", className: "bg-amber" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <span className={cn("size-3 rounded-[4px]", item.className)} aria-hidden />
          {t(item.key)}
        </li>
      ))}
    </ul>
  );
}

function QuoteSummary(props: {
  period: string;
  quote: QuoteResult;
  deposit: number;
  price: (n: number) => string;
  problem: string | null;
  labels: { period: string; tariff: string; total: string; deposit: string; tariffName: string; lines: string[] };
}) {
  const { quote, labels, price } = props;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-bg/50 p-4" aria-live="polite">
      <div className="flex justify-between gap-3 text-sm">
        <span className="text-muted">{labels.period}</span>
        <span className="text-right font-medium">{props.period}</span>
      </div>
      {quote.ok ? (
        <>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted">{labels.tariff}</span>
            <span className="font-medium">{labels.tariffName}</span>
          </div>
          <ul className="flex flex-col gap-1.5 border-t border-line pt-3 text-sm">
            {quote.quote.lines.map((line, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="text-muted">{labels.lines[i]}</span>
                <span className="tabular-nums">{price(line.total)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
            <span className="font-semibold">{labels.total}</span>
            <span className="font-display text-2xl font-semibold tabular-nums">{price(quote.quote.total)}</span>
          </div>
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-muted">{labels.deposit}</span>
            <span className="tabular-nums">{price(props.deposit)}</span>
          </div>
        </>
      ) : (
        <p className="text-sm text-busy">{props.problem}</p>
      )}
    </div>
  );
}

function Field(props: { id: string; label: ReactNode; error: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={props.id} className="text-sm text-muted">
        {props.label}
      </label>
      {props.children}
      {props.error && (
        <p id={`${props.id}-error`} className="text-xs text-busy">
          {props.error}
        </p>
      )}
    </div>
  );
}

function Checkbox({
  id,
  error,
  children,
  ...input
}: { id: string; error: string | null; children: ReactNode } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
        <input
          id={id}
          type="checkbox"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md accent-amber"
          {...input}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="pl-8 text-xs text-busy">
          {error}
        </p>
      )}
    </div>
  );
}
