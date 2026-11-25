"use client";

import type { Pricing, PricingOverride, RentalRules, RentalRulesOverride } from "@/lib/db/json";
import { RENTAL_TYPES } from "@/lib/db/json";
import { cn } from "@/lib/utils/cn";
import { adminInput, adminLabel } from "./ui";

/*
 * Tariffs and driver rules with inheritance: global settings → category → car.
 * Empty field = inherit (the inherited value is shown as the placeholder).
 */

const TARIFF_LABEL = { hourly: "Valandinė", daily: "Paros", weekly: "Savaitės", long_term: "Ilgalaikė" } as const;
type TariffKey = keyof typeof TARIFF_LABEL;

const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));
const clean = <T extends Record<string, unknown>>(o: T): T | undefined => {
  const entries = Object.entries(o).filter(([, v]) => v !== undefined && !(typeof v === "number" && Number.isNaN(v)));
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
};

function NumberInput(props: {
  value: number | undefined | null;
  placeholder?: string | number;
  onChange: (v: number | undefined) => void;
  label: string;
  step?: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", props.className)}>
      <span className={adminLabel}>{props.label}</span>
      <span className="relative">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={props.step ?? "1"}
          value={props.value ?? ""}
          placeholder={props.placeholder === undefined ? "" : String(props.placeholder)}
          onChange={(e) => props.onChange(num(e.target.value))}
          className={cn(adminInput, props.suffix && "pr-10")}
        />
        {props.suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3.5 grid place-items-center text-xs text-muted">
            {props.suffix}
          </span>
        )}
      </span>
    </label>
  );
}

/* ── Global tariffs (settings): every value required ─────────────────────── */

export function PricingFields({ value, onChange }: { value: Pricing; onChange: (v: Pricing) => void }) {
  const set = <K extends TariffKey>(key: K, patch: Partial<Pricing[K]>) =>
    onChange({ ...value, [key]: { ...value[key], ...patch } });
  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(TARIFF_LABEL) as TariffKey[]).map((key) => (
        <div
          key={key}
          className="grid items-end gap-3 rounded-xl border border-line bg-bg/40 p-3 sm:grid-cols-[10rem_1fr_1fr]"
        >
          <label className="flex h-11 items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={value[key].enabled}
              onChange={(e) => set(key, { enabled: e.target.checked } as Partial<Pricing[typeof key]>)}
              className="size-4 accent-amber"
            />
            {TARIFF_LABEL[key]}
          </label>
          {key === "long_term" ? (
            <>
              <NumberInput
                label="Kaina už savaitę"
                suffix="€"
                step="0.01"
                value={value.long_term.price_per_week}
                onChange={(v) => set("long_term", { price_per_week: v ?? 0 })}
              />
              <NumberInput
                label="Nuo kiek savaičių"
                value={value.long_term.min_weeks}
                onChange={(v) => set("long_term", { min_weeks: v ?? 4 })}
              />
            </>
          ) : (
            <>
              <NumberInput
                label={key === "hourly" ? "Kaina už valandą" : key === "daily" ? "Kaina už parą" : "Kaina už savaitę"}
                suffix="€"
                step="0.01"
                value={value[key].price}
                onChange={(v) => set(key, { price: v ?? 0 } as Partial<Pricing[typeof key]>)}
              />
              {key === "hourly" ? (
                <NumberInput
                  label="Mažiausiai valandų"
                  value={value.hourly.min_hours}
                  onChange={(v) => set("hourly", { min_hours: v ?? 1 })}
                />
              ) : (
                <span className="hidden sm:block" />
              )}
            </>
          )}
        </div>
      ))}
      <NumberInput
        label="Užstatas"
        suffix="€"
        step="0.01"
        className="sm:max-w-56"
        value={value.deposit}
        onChange={(v) => onChange({ ...value, deposit: v ?? 0 })}
      />
    </div>
  );
}

/* ── Overrides (category / car): empty = inherit ─────────────────────────── */

export function PricingOverrideFields(props: {
  value: PricingOverride;
  onChange: (v: PricingOverride) => void;
  inherited: Pricing;
  inheritedFrom: string;
  /** Car deposit lives in its own column; categories keep it inside the override. */
  deposit?: { value: number | null; onChange: (v: number | null) => void };
}) {
  const { value, onChange, inherited } = props;
  const set = (key: TariffKey, patch: Record<string, unknown>) => {
    const next = clean({ ...(value[key] ?? {}), ...patch });
    onChange({ ...value, [key]: next });
  };
  const enabledValue = (key: TariffKey) =>
    value[key]?.enabled === undefined ? "inherit" : value[key]?.enabled ? "on" : "off";

  return (
    <div className="flex flex-col gap-3">
      {(Object.keys(TARIFF_LABEL) as TariffKey[]).map((key) => {
        const inh = inherited[key];
        const effectiveOn = value[key]?.enabled ?? inh.enabled;
        return (
          <div
            key={key}
            className={cn(
              "grid items-end gap-3 rounded-xl border border-line bg-bg/40 p-3 sm:grid-cols-[10rem_1fr_1fr]",
              !effectiveOn && "opacity-70",
            )}
          >
            <label className="flex flex-col gap-1.5">
              <span className={adminLabel}>{TARIFF_LABEL[key]}</span>
              <select
                value={enabledValue(key)}
                onChange={(e) =>
                  set(key, { enabled: e.target.value === "inherit" ? undefined : e.target.value === "on" })
                }
                className={adminInput}
              >
                <option value="inherit">
                  Kaip {props.inheritedFrom} ({inh.enabled ? "įjungta" : "išjungta"})
                </option>
                <option value="on">Įjungta</option>
                <option value="off">Išjungta</option>
              </select>
            </label>
            {key === "long_term" ? (
              <>
                <NumberInput
                  label="Kaina už savaitę"
                  suffix="€"
                  step="0.01"
                  placeholder={inherited.long_term.price_per_week}
                  value={value.long_term?.price_per_week}
                  onChange={(v) => set("long_term", { price_per_week: v })}
                />
                <NumberInput
                  label="Nuo kiek savaičių"
                  placeholder={inherited.long_term.min_weeks}
                  value={value.long_term?.min_weeks}
                  onChange={(v) => set("long_term", { min_weeks: v })}
                />
              </>
            ) : (
              <>
                <NumberInput
                  label={key === "hourly" ? "Kaina už valandą" : key === "daily" ? "Kaina už parą" : "Kaina už savaitę"}
                  suffix="€"
                  step="0.01"
                  placeholder={inherited[key].price}
                  value={value[key]?.price}
                  onChange={(v) => set(key, { price: v })}
                />
                {key === "hourly" ? (
                  <NumberInput
                    label="Mažiausiai valandų"
                    placeholder={inherited.hourly.min_hours}
                    value={value.hourly?.min_hours}
                    onChange={(v) => set("hourly", { min_hours: v })}
                  />
                ) : (
                  <span className="hidden sm:block" />
                )}
              </>
            )}
          </div>
        );
      })}
      <NumberInput
        label="Užstatas"
        suffix="€"
        step="0.01"
        className="sm:max-w-56"
        placeholder={inherited.deposit}
        value={props.deposit ? props.deposit.value : value.deposit}
        onChange={(v) => (props.deposit ? props.deposit.onChange(v ?? null) : onChange({ ...value, deposit: v }))}
      />
      <p className="text-xs text-muted">Tuščias laukelis — naudojama {props.inheritedFrom} reikšmė (rodoma pilkai).</p>
    </div>
  );
}

/* ── Driver rules ────────────────────────────────────────────────────────── */

export function RulesFields({ value, onChange }: { value: RentalRules; onChange: (v: RentalRules) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <NumberInput
        label="Vairuotojo amžius nuo"
        suffix="m."
        value={value.min_age}
        onChange={(v) => onChange({ ...value, min_age: v ?? 18 })}
      />
      <NumberInput
        label="Vairavimo stažas nuo"
        suffix="m."
        value={value.min_license_years}
        onChange={(v) => onChange({ ...value, min_license_years: v ?? 0 })}
      />
      <NumberInput
        label="Mažiausias nuomos laikotarpis"
        suffix="d."
        placeholder="neribojama"
        value={value.min_rental_days}
        onChange={(v) => onChange({ ...value, min_rental_days: v ?? null })}
      />
      <NumberInput
        label="Ridos limitas per parą"
        suffix="km"
        placeholder="neribota"
        value={value.mileage_limit_km_per_day}
        onChange={(v) => onChange({ ...value, mileage_limit_km_per_day: v ?? null })}
      />
    </div>
  );
}

export function RulesOverrideFields(props: {
  value: RentalRulesOverride;
  onChange: (v: RentalRulesOverride) => void;
  inherited: RentalRules;
  inheritedFrom: string;
}) {
  const { value, onChange, inherited } = props;
  const set = (patch: RentalRulesOverride) => onChange(clean({ ...value, ...patch }) ?? {});
  const types = value.allowed_rental_types;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <NumberInput
          label="Vairuotojo amžius nuo"
          suffix="m."
          placeholder={inherited.min_age}
          value={value.min_age}
          onChange={(v) => set({ min_age: v })}
        />
        <NumberInput
          label="Vairavimo stažas nuo"
          suffix="m."
          placeholder={inherited.min_license_years}
          value={value.min_license_years}
          onChange={(v) => set({ min_license_years: v })}
        />
        <NumberInput
          label="Mažiausias nuomos laikotarpis"
          suffix="d."
          placeholder={inherited.min_rental_days ?? "neribojama"}
          value={value.min_rental_days}
          onChange={(v) => set({ min_rental_days: v })}
        />
        <NumberInput
          label="Ridos limitas per parą"
          suffix="km"
          placeholder={inherited.mileage_limit_km_per_day ?? "neribota"}
          value={value.mileage_limit_km_per_day}
          onChange={(v) => set({ mileage_limit_km_per_day: v })}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className={cn(adminLabel, "mb-2")}>Leidžiami nuomos būdai</legend>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-amber"
            checked={!types}
            onChange={(e) =>
              set({
                allowed_rental_types: e.target.checked
                  ? undefined
                  : [...(inherited.allowed_rental_types ?? RENTAL_TYPES)],
              })
            }
          />
          Kaip {props.inheritedFrom} (
          {inherited.allowed_rental_types
            ? inherited.allowed_rental_types.map((t) => TARIFF_LABEL[t]).join(", ")
            : "visi įjungti tarifai"}
          )
        </label>
        {types && (
          <div className="flex flex-wrap gap-x-5 gap-y-2 pl-6">
            {RENTAL_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-amber"
                  checked={types.includes(t)}
                  onChange={(e) => {
                    const next = e.target.checked ? [...types, t] : types.filter((x) => x !== t);
                    if (next.length > 0) set({ allowed_rental_types: RENTAL_TYPES.filter((x) => next.includes(x)) });
                  }}
                />
                {TARIFF_LABEL[t]}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <p className="text-xs text-muted">Tuščias laukelis — naudojama {props.inheritedFrom} reikšmė (rodoma pilkai).</p>
    </div>
  );
}
