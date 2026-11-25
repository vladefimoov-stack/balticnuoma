"use client";

import { Copy, ExternalLink, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { deleteCar, duplicateCar } from "@/lib/admin/car-actions";
import type { CarForm } from "@/lib/admin/car-schema";
import type { CarEditorData } from "@/lib/admin/cars";
import { CAR_STATUSES, resolveCarTerms, resolvePricing, resolveRentalRules } from "@/lib/db/json";
import { availableModes } from "@/lib/pricing/calculate";
import { fromPricePerDay } from "@/lib/pricing/display";
import { cn } from "@/lib/utils/cn";
import { PricingOverrideFields, RulesOverrideFields } from "../TermsFields";
import { adminInput, adminLabel, Card, CardTitle, CAR_STATUS_LABEL, Notice } from "../ui";

const STATUS_HELP: Record<(typeof CAR_STATUSES)[number], string> = {
  draft: "Ruošiamas, svetainėje nerodomas.",
  published: "Rodomas kataloge, galima rezervuoti.",
  hidden: "Laikinai nerodomas svetainėje (rezervacijos išlieka).",
  maintenance: "Remontas / techninė apžiūra: svetainėje nerodomas.",
};

type Props = {
  carId: string;
  form: CarForm;
  set: (patch: Partial<CarForm>) => void;
  data: CarEditorData;
  isAdmin: boolean;
  errorField: string | null;
};

export function PublishStep({ carId, form, set, data, isAdmin, errorField }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const category = data.categories.find((c) => c.id === form.categoryId);
  const inheritedPricing = resolvePricing(data.globalPricing, category?.pricing);
  const inheritedRules = resolveRentalRules(data.globalRules, category?.rules);
  const terms = resolveCarTerms({
    globalPricing: data.globalPricing,
    globalRules: data.globalRules,
    categoryPricing: category?.pricing,
    categoryRules: category?.rules,
    carPricing: form.priceOverrides,
    carRules: form.rentalRules,
    carDeposit: form.deposit,
  });
  const modes = availableModes(terms.pricing, terms.rules);
  const from = fromPricePerDay(terms.pricing);

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle>Kainos</CardTitle>
        <p className="mb-4 text-sm text-muted">
          Pagal nutylėjimą naudojamos kategorijos „{category?.name}“ kainos. Įrašykite reikšmę tik ten, kur šis
          automobilis skiriasi.
        </p>
        <div className={cn(errorField === "priceOverrides" && "rounded-xl ring-1 ring-busy/50")}>
          <PricingOverrideFields
            value={form.priceOverrides}
            onChange={(priceOverrides) => set({ priceOverrides })}
            inherited={inheritedPricing}
            inheritedFrom="kategorijoje"
            deposit={{ value: form.deposit, onChange: (deposit) => set({ deposit }) }}
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Reikalavimai ir sąlygos</CardTitle>
        <RulesOverrideFields
          value={form.rentalRules}
          onChange={(rentalRules) => set({ rentalRules })}
          inherited={inheritedRules}
          inheritedFrom="kategorijoje"
        />
      </Card>

      <Card>
        <CardTitle>Paskelbimas</CardTitle>
        <div className="mb-4 rounded-xl border border-line bg-bg/40 p-3 text-sm">
          <p>
            Svetainėje:{" "}
            <strong>
              {from !== null ? `nuo ${from} € / parą` : modes.hourly ? `${terms.pricing.hourly.price} € / val.` : "—"}
            </strong>
            {" · "}užstatas {terms.deposit} €{" · "}nuo {terms.rules.min_age} m., stažas nuo{" "}
            {terms.rules.min_license_years} m.
          </p>
          {!modes.days && !modes.hourly && (
            <p className="mt-1 text-busy">Neįjungtas nė vienas tarifas — paskelbti negalima.</p>
          )}
        </div>
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Būsena</legend>
          {CAR_STATUSES.map((status) => (
            <label
              key={status}
              className={cn(
                "flex cursor-pointer gap-3 rounded-xl border p-3 transition-colors",
                form.status === status ? "border-amber/60 bg-amber/8" : "border-line hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="status"
                value={status}
                checked={form.status === status}
                onChange={() => set({ status })}
                className="mt-0.5 size-4 accent-amber"
              />
              <span className="flex flex-col">
                <span className="text-sm font-semibold">{CAR_STATUS_LABEL[status]}</span>
                <span className="text-xs text-muted">{STATUS_HELP[status]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="mt-4 flex max-w-56 flex-col gap-1.5">
          <span className={adminLabel}>Eilės numeris kataloge</span>
          <input
            type="number"
            value={form.sort}
            onChange={(e) => set({ sort: Number(e.target.value) || 0 })}
            className={adminInput}
          />
          <span className="text-xs text-muted">Mažesnis — rodomas anksčiau.</span>
        </label>
        {form.status === "published" && (
          <a
            href={`/automobiliai/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-amber hover:underline"
          >
            <ExternalLink className="size-4" aria-hidden /> Peržiūrėti svetainėje
          </a>
        )}
      </Card>

      <Card>
        <CardTitle>Kiti veiksmai</CardTitle>
        {error && (
          <Notice tone="error" className="mb-3">
            {error}
          </Notice>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => start(() => duplicateCar(carId))}>
            <Copy className="size-4" aria-hidden /> Dubliuoti automobilį
          </Button>
          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              disabled={pending}
              className="hover:border-busy/60 hover:text-busy"
              onClick={() => {
                if (!window.confirm("Ištrinti automobilį visam laikui? Nuotraukos irgi bus ištrintos.")) return;
                start(async () => {
                  const res = await deleteCar(carId);
                  if (res && !res.ok) setError(res.error);
                });
              }}
            >
              <Trash2 className="size-4" aria-hidden /> Ištrinti
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
