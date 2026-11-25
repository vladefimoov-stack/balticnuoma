"use client";

import { Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { FEATURE_ICONS } from "@/components/cars/feature-icons";
import type { CarForm } from "@/lib/admin/car-schema";
import type { CarEditorData } from "@/lib/admin/cars";
import {
  BODY_TYPES,
  DRIVES,
  FUEL_TYPES,
  KNOWN_FEATURES,
  TRANSMISSIONS,
  type CarSpecs,
  type KnownFeature,
} from "@/lib/db/json";
import { cn } from "@/lib/utils/cn";
import { slugify } from "@/lib/utils/slug";
import { RichTextEditor } from "../RichTextEditor";
import { adminInput, adminLabel, Card, CardTitle } from "../ui";

export type EditorLabels = {
  features: Record<KnownFeature, string>;
  fuel: Record<(typeof FUEL_TYPES)[number], string>;
  transmission: Record<(typeof TRANSMISSIONS)[number], string>;
  drive: Record<(typeof DRIVES)[number], string>;
  body: Record<(typeof BODY_TYPES)[number], string>;
};

type Props = {
  form: CarForm;
  set: (patch: Partial<CarForm>) => void;
  data: Pick<CarEditorData, "categories" | "makes" | "models" | "publishedAt">;
  labels: EditorLabels;
  errorField: string | null;
};

const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(",", ".")));

function Field({
  label,
  children,
  className,
  error,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  error?: boolean;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className={cn(adminLabel, error && "text-busy")}>{label}</span>
      {children}
    </label>
  );
}

export function BasicStep({ form, set, data, labels, errorField }: Props) {
  const modelOptions = data.models.filter((m) => m.make.toLowerCase() === form.make.trim().toLowerCase());
  const setSpec = <K extends keyof CarSpecs>(key: K, value: CarSpecs[K] | undefined) => {
    const specs = { ...form.specs };
    if (value === undefined || value === ("" as unknown) || (typeof value === "number" && Number.isNaN(value)))
      delete specs[key];
    else specs[key] = value;
    set({ specs });
  };
  const electric = form.specs.fuel === "electric" || form.specs.fuel === "plug_in_hybrid";

  /** Suggest the title from make + model while it is still the default one. */
  const onMakeModel = (patch: Partial<CarForm>) => {
    const next = { ...form, ...patch };
    const auto = `${next.make} ${next.model}`.trim();
    const prevAuto = `${form.make} ${form.model}`.trim();
    const titleIsAuto = form.titleLt === "Naujas automobilis" || form.titleLt === prevAuto || form.titleLt === "";
    const model = data.models.find(
      (m) => m.make.toLowerCase() === next.make.toLowerCase() && m.name.toLowerCase() === next.model.toLowerCase(),
    );
    set({
      ...patch,
      ...(titleIsAuto && auto ? { titleLt: auto } : {}),
      ...(titleIsAuto && auto && !data.publishedAt ? { slug: slugify(auto) } : {}),
      ...(model?.bodyType && !form.bodyType ? { bodyType: model.bodyType } : {}),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardTitle>Pagrindinė informacija</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Kategorija *" error={errorField === "categoryId"}>
            <select
              value={form.categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
              className={adminInput}
            >
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Markė" error={errorField === "make"}>
            <input
              list="makes-list"
              value={form.make}
              onChange={(e) => onMakeModel({ make: e.target.value })}
              className={adminInput}
              placeholder="Pvz.: Toyota"
            />
            <datalist id="makes-list">
              {data.makes.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          <Field label="Modelis">
            <input
              list="models-list"
              value={form.model}
              onChange={(e) => onMakeModel({ model: e.target.value })}
              className={adminInput}
              placeholder="Pvz.: Prius"
            />
            <datalist id="models-list">
              {modelOptions.map((m) => (
                <option key={m.name} value={m.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Metai" error={errorField === "year"}>
            <input
              type="number"
              inputMode="numeric"
              min={1950}
              max={2100}
              value={form.year ?? ""}
              onChange={(e) => set({ year: num(e.target.value) ?? null })}
              className={adminInput}
            />
          </Field>
          <Field label="Kėbulo tipas">
            <select
              value={form.bodyType ?? ""}
              onChange={(e) => set({ bodyType: (e.target.value || null) as CarForm["bodyType"] })}
              className={adminInput}
            >
              <option value="">—</option>
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>
                  {labels.body[b]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Valstybinis numeris">
            <input
              value={form.plate}
              maxLength={16}
              onChange={(e) => set({ plate: e.target.value.toUpperCase() })}
              className={adminInput}
              placeholder="ABC 123"
            />
          </Field>
          <Field label="Pavadinimas LT *" className="sm:col-span-2 lg:col-span-1" error={errorField === "titleLt"}>
            <input
              value={form.titleLt}
              maxLength={120}
              onChange={(e) => set({ titleLt: e.target.value })}
              className={adminInput}
              aria-invalid={errorField === "titleLt"}
            />
          </Field>
          <Field label="Pavadinimas EN (jei skiriasi)">
            <input
              value={form.titleEn}
              maxLength={120}
              onChange={(e) => set({ titleEn: e.target.value })}
              className={adminInput}
            />
          </Field>
          <Field label="Spalva">
            <span className="flex gap-2">
              <input
                type="color"
                value={form.color || "#c9d1dc"}
                onChange={(e) => set({ color: e.target.value })}
                className="h-11 w-14 cursor-pointer rounded-xl border border-line-strong bg-bg/70 p-1"
                aria-label="Spalva"
              />
              <input
                value={form.color}
                placeholder="#RRGGBB"
                onChange={(e) => set({ color: e.target.value })}
                className={adminInput}
              />
            </span>
          </Field>
          <Field label="Adresas svetainėje *" className="sm:col-span-2 lg:col-span-3" error={errorField === "slug"}>
            <span className="flex flex-col gap-2 sm:flex-row">
              <span className="flex flex-1 items-center overflow-hidden rounded-xl border border-line-strong bg-bg/70 focus-within:border-amber">
                <span className="pl-3.5 text-sm text-muted">/automobiliai/</span>
                <input
                  value={form.slug}
                  maxLength={120}
                  onChange={(e) => set({ slug: e.target.value.toLowerCase() })}
                  className="h-11 min-w-0 flex-1 bg-transparent pr-3.5 text-sm outline-none"
                  aria-invalid={errorField === "slug"}
                />
              </span>
              <button
                type="button"
                onClick={() => set({ slug: slugify(form.titleLt) })}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-3.5 text-sm text-muted hover:text-fg"
              >
                <Wand2 className="size-4" aria-hidden /> Pagal pavadinimą
              </button>
            </span>
            {data.publishedAt && (
              <span className="text-xs text-pending">
                Pakeitus paskelbto automobilio adresą, senos nuorodos nebeveiks.
              </span>
            )}
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle>Aprašymas</CardTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          <RichTextEditor
            id="desc-lt"
            label="Lietuviškai"
            value={form.descriptionLt}
            onChange={(v) => set({ descriptionLt: v })}
            placeholder="Trumpai apie automobilį: kam jis tinka, kuo patogus…"
          />
          <RichTextEditor
            id="desc-en"
            label="Angliškai (neprivaloma)"
            value={form.descriptionEn}
            onChange={(v) => set({ descriptionEn: v })}
            placeholder="Short description in English…"
          />
        </div>
      </Card>

      <Card>
        <CardTitle>Techniniai duomenys</CardTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-invalid={errorField === "specs"}>
          <Field label="Kuras">
            <select
              value={form.specs.fuel ?? ""}
              onChange={(e) => setSpec("fuel", (e.target.value || undefined) as CarSpecs["fuel"])}
              className={adminInput}
            >
              <option value="">—</option>
              {FUEL_TYPES.map((f) => (
                <option key={f} value={f}>
                  {labels.fuel[f]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pavarų dėžė">
            <select
              value={form.specs.transmission ?? ""}
              onChange={(e) => setSpec("transmission", (e.target.value || undefined) as CarSpecs["transmission"])}
              className={adminInput}
            >
              <option value="">—</option>
              {TRANSMISSIONS.map((t) => (
                <option key={t} value={t}>
                  {labels.transmission[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Varantieji ratai">
            <select
              value={form.specs.drive ?? ""}
              onChange={(e) => setSpec("drive", (e.target.value || undefined) as CarSpecs["drive"])}
              className={adminInput}
            >
              <option value="">—</option>
              {DRIVES.map((d) => (
                <option key={d} value={d}>
                  {labels.drive[d]}
                </option>
              ))}
            </select>
          </Field>
          {(
            [
              ["engine_l", "Variklio tūris, l", "0.1"],
              ["power_hp", "Galia, AG", "1"],
              ["acceleration_0_100_s", "0–100 km/h, s", "0.1"],
              ["seats", "Vietų skaičius", "1"],
              ["doors", "Durų skaičius", "1"],
              ["consumption_l_100km", "Sąnaudos, l/100 km", "0.1"],
              ...(electric
                ? ([
                    ["consumption_kwh_100km", "Elektros sąnaudos, kWh/100 km", "0.1"],
                    ["range_km", "Nuvažiuojama elektra, km", "1"],
                  ] as const)
                : []),
              ["trunk_l", "Bagažinė, l", "1"],
            ] as const
          ).map(([key, label, step]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={step}
                value={(form.specs[key] as number | undefined) ?? ""}
                onChange={(e) => setSpec(key, num(e.target.value))}
                className={adminInput}
              />
            </Field>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle
          aside={
            <button
              type="button"
              onClick={() =>
                set({ customSpecs: [...form.customSpecs, { label_lt: "", value_lt: "", label_en: "", value_en: "" }] })
              }
              className="inline-flex items-center gap-1.5 text-sm text-amber hover:underline"
            >
              <Plus className="size-4" aria-hidden /> Pridėti
            </button>
          }
        >
          Papildomi duomenys
        </CardTitle>
        <p className="mb-3 text-xs text-muted">
          Pvz.: „Masažinės sėdynės — Taip“, „Garso sistema — Bang & Olufsen“. Eilutė išsaugoma, kai užpildyti abu LT
          laukeliai.
        </p>
        <ul className="flex flex-col gap-3">
          {form.customSpecs.map((row, i) => {
            const update = (patch: Partial<typeof row>) =>
              set({ customSpecs: form.customSpecs.map((r, k) => (k === i ? { ...r, ...patch } : r)) });
            const incomplete = !row.label_lt.trim() !== !row.value_lt.trim();
            return (
              <li
                key={i}
                className={cn(
                  "grid gap-2 rounded-xl border bg-bg/40 p-3 sm:grid-cols-[1fr_1fr_auto]",
                  incomplete ? "border-pending/40" : "border-line",
                )}
              >
                <input
                  value={row.label_lt}
                  placeholder="Pavadinimas LT"
                  onChange={(e) => update({ label_lt: e.target.value })}
                  className={adminInput}
                />
                <input
                  value={row.value_lt}
                  placeholder="Reikšmė LT"
                  onChange={(e) => update({ value_lt: e.target.value })}
                  className={adminInput}
                />
                <button
                  type="button"
                  aria-label="Pašalinti eilutę"
                  onClick={() => set({ customSpecs: form.customSpecs.filter((_, k) => k !== i) })}
                  className="grid size-11 place-items-center rounded-xl border border-line text-muted hover:border-busy/50 hover:text-busy sm:row-span-2"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
                <input
                  value={row.label_en ?? ""}
                  placeholder="Label EN"
                  onChange={(e) => update({ label_en: e.target.value })}
                  className={adminInput}
                />
                <input
                  value={row.value_en ?? ""}
                  placeholder="Value EN"
                  onChange={(e) => update({ value_en: e.target.value })}
                  className={adminInput}
                />
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardTitle
          aside={
            <button
              type="button"
              onClick={() =>
                set({
                  features: [
                    ...form.features,
                    { key: `custom-${crypto.randomUUID().slice(0, 8)}`, icon: "sparkles", label_lt: "", label_en: "" },
                  ],
                })
              }
              className="inline-flex items-center gap-1.5 text-sm text-amber hover:underline"
            >
              <Plus className="size-4" aria-hidden /> Sava įranga
            </button>
          }
        >
          Įranga
        </CardTitle>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(KNOWN_FEATURES) as KnownFeature[]).map((key) => {
            const checked = form.features.some((f) => f.key === key);
            const Icon = FEATURE_ICONS[KNOWN_FEATURES[key]] ?? Sparkles;
            return (
              <label
                key={key}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                  checked ? "border-amber/50 bg-amber/8" : "border-line hover:border-line-strong",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) =>
                    set({
                      features: e.target.checked
                        ? [...form.features, { key }]
                        : form.features.filter((f) => f.key !== key),
                    })
                  }
                  className="size-4 accent-amber"
                />
                <Icon className="size-4 text-amber/80" aria-hidden />
                {labels.features[key]}
              </label>
            );
          })}
        </div>
        {form.features.some((f) => !(f.key in KNOWN_FEATURES)) && (
          <ul className="mt-4 flex flex-col gap-3">
            {form.features.map((f, i) => {
              if (f.key in KNOWN_FEATURES) return null;
              const update = (patch: Partial<typeof f>) =>
                set({ features: form.features.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
              return (
                <li
                  key={f.key}
                  className="grid gap-2 rounded-xl border border-line bg-bg/40 p-3 sm:grid-cols-[9rem_1fr_1fr_auto]"
                >
                  <select
                    value={f.icon ?? "sparkles"}
                    onChange={(e) => update({ icon: e.target.value })}
                    className={adminInput}
                    aria-label="Piktograma"
                  >
                    {Object.keys(FEATURE_ICONS).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    value={f.label_lt ?? ""}
                    placeholder="Pavadinimas LT"
                    onChange={(e) => update({ label_lt: e.target.value })}
                    className={adminInput}
                  />
                  <input
                    value={f.label_en ?? ""}
                    placeholder="Name EN"
                    onChange={(e) => update({ label_en: e.target.value })}
                    className={adminInput}
                  />
                  <button
                    type="button"
                    aria-label="Pašalinti"
                    onClick={() => set({ features: form.features.filter((_, k) => k !== i) })}
                    className="grid size-11 place-items-center rounded-xl border border-line text-muted hover:border-busy/50 hover:text-busy"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
