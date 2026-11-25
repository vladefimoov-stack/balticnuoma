"use client";

import { Loader2, Save, Trash2, Wand2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/admin/booking-actions";
import { deleteCategory, saveCategory, type CategoryForm } from "@/lib/admin/category-actions";
import type { Pricing, PricingOverride, RentalRules, RentalRulesOverride } from "@/lib/db/json";
import { slugify } from "@/lib/utils/slug";
import { PricingOverrideFields, RulesOverrideFields } from "./TermsFields";
import { adminInput, adminLabel, Card, CardTitle, Notice } from "./ui";

export const CATEGORY_ICONS = ["leaf", "gem", "crown", "car", "zap", "briefcase", "users", "mountain", "sparkles"];

type Props = {
  id: string | null;
  initial: CategoryForm & { pricing: PricingOverride; rules: RentalRulesOverride };
  globalPricing: Pricing;
  globalRules: RentalRules;
  carCount: number;
  isAdmin: boolean;
  created?: boolean;
};

export function CategoryEditor({ id, initial, globalPricing, globalRules, carCount, isAdmin, created }: Props) {
  const [form, setForm] = useState(initial);
  const [result, setResult] = useState<ActionResult | null>(
    created ? { ok: true, message: "Kategorija sukurta." } : null,
  );
  const [pending, start] = useTransition();
  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setResult(null);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await saveCategory(id, form)));
      }}
      className="flex flex-col gap-5"
    >
      <Card>
        <CardTitle>Pagrindinė informacija</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Pavadinimas LT *</span>
            <input
              value={form.nameLt}
              maxLength={80}
              required
              onChange={(e) => set({ nameLt: e.target.value, ...(!id ? { slug: slugify(e.target.value) } : {}) })}
              className={adminInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Pavadinimas EN *</span>
            <input
              value={form.nameEn}
              maxLength={80}
              required
              onChange={(e) => set({ nameEn: e.target.value })}
              className={adminInput}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Adresas (filtrui kataloge) *</span>
            <span className="flex gap-2">
              <input
                value={form.slug}
                maxLength={120}
                required
                onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
                className={adminInput}
              />
              <button
                type="button"
                onClick={() => set({ slug: slugify(form.nameLt) })}
                aria-label="Sugeneruoti pagal pavadinimą"
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-fg"
              >
                <Wand2 className="size-4" aria-hidden />
              </button>
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={adminLabel}>Piktograma</span>
              <select value={form.icon} onChange={(e) => set({ icon: e.target.value })} className={adminInput}>
                <option value="">—</option>
                {CATEGORY_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={adminLabel}>Eilės nr.</span>
              <input
                type="number"
                value={form.sort}
                onChange={(e) => set({ sort: Number(e.target.value) || 0 })}
                className={adminInput}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Aprašymas LT</span>
            <textarea
              value={form.descriptionLt}
              maxLength={500}
              rows={2}
              onChange={(e) => set({ descriptionLt: e.target.value })}
              className={`${adminInput} h-auto py-2.5`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={adminLabel}>Aprašymas EN</span>
            <textarea
              value={form.descriptionEn}
              maxLength={500}
              rows={2}
              onChange={(e) => set({ descriptionEn: e.target.value })}
              className={`${adminInput} h-auto py-2.5`}
            />
          </label>
        </div>
      </Card>

      <Card>
        <CardTitle>Kainos pagal nutylėjimą</CardTitle>
        <p className="mb-4 text-sm text-muted">
          Taikomos visiems šios kategorijos automobiliams (jei automobilyje nenurodyta kitaip). Tuščia — bendri tarifai
          iš nustatymų.
        </p>
        <PricingOverrideFields
          value={form.pricing}
          onChange={(pricing) => set({ pricing })}
          inherited={globalPricing}
          inheritedFrom="bendruose nustatymuose"
        />
      </Card>

      <Card>
        <CardTitle>Reikalavimai pagal nutylėjimą</CardTitle>
        <RulesOverrideFields
          value={form.rules}
          onChange={(rules) => set({ rules })}
          inherited={globalRules}
          inheritedFrom="bendruose nustatymuose"
        />
      </Card>

      {result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          {id ? "Išsaugoti" : "Sukurti kategoriją"}
        </Button>
        {id && isAdmin && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            className="hover:text-busy"
            title={carCount > 0 ? "Kategorijoje yra automobilių" : undefined}
            onClick={() => {
              if (!window.confirm("Ištrinti kategoriją?")) return;
              start(async () => {
                const res = await deleteCategory(id);
                if (res && !res.ok) setResult(res);
              });
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Ištrinti kategoriją
          </Button>
        )}
      </div>
    </form>
  );
}
