"use client";

import { Loader2, Mail, Plus, Save, Trash2 } from "lucide-react";
import { useState, useTransition, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { ActionResult } from "@/lib/admin/booking-actions";
import { saveSetting, sendTestEmail } from "@/lib/admin/settings-actions";
import type { Pricing, RentalRules } from "@/lib/db/json";
import { cn } from "@/lib/utils/cn";
import { PricingFields, RulesFields } from "./TermsFields";
import { adminInput, adminLabel, Card, CardTitle, Notice } from "./ui";

type Contacts = {
  phone: string;
  whatsapp_url: string;
  telegram_username: string;
  email: string;
  address: string;
  office_open: boolean;
};
type Hours = Array<{ days: number[]; opens: string; closes: string }>;
type Company = {
  legal_name: string;
  company_code: string;
  vat_code: string;
  registered_address: string;
  privacy_email: string;
};

export type SettingsValues = {
  pricing: Pricing;
  rental_rules: RentalRules;
  contacts: Contacts;
  opening_hours: Hours;
  notifications: { booking_email: string | null };
  company: Company;
};

const DAY_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII"];

function Section({
  title,
  description,
  settingKey,
  value,
  children,
}: {
  title: string;
  description?: string;
  settingKey: keyof SettingsValues;
  value: () => unknown;
  children: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    start(async () => setResult(await saveSetting(settingKey, value())));
  };
  return (
    <Card>
      <form onSubmit={onSubmit} onChange={() => setResult(null)} className="flex flex-col gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="-mt-2 text-sm text-muted">{description}</p>}
        </div>
        {children}
        {result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>}
        <div>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            Išsaugoti
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function SettingsForms({ initial }: { initial: SettingsValues }) {
  const [pricing, setPricing] = useState(initial.pricing);
  const [rules, setRules] = useState(initial.rental_rules);
  const [contacts, setContacts] = useState(initial.contacts);
  const [hours, setHours] = useState(initial.opening_hours);
  const [notifyEmail, setNotifyEmail] = useState(initial.notifications.booking_email ?? "");
  const [company, setCompany] = useState(initial.company);

  const companyField = (key: keyof Company, label: string, props: InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="flex flex-col gap-1.5">
      <span className={adminLabel}>{label}</span>
      <input
        value={company[key]}
        onChange={(e) => setCompany({ ...company, [key]: e.target.value })}
        className={adminInput}
        {...props}
      />
    </label>
  );

  const contactField = (
    key: Exclude<keyof Contacts, "office_open">,
    label: string,
    props: InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <label className="flex flex-col gap-1.5">
      <span className={adminLabel}>{label}</span>
      <input
        value={contacts[key]}
        onChange={(e) => setContacts({ ...contacts, [key]: e.target.value })}
        className={adminInput}
        {...props}
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-5">
      <Section
        title="Bendri tarifai"
        description="Naudojami visiems automobiliams, jei kategorijoje ar automobilyje nenurodyta kitaip."
        settingKey="pricing"
        value={() => pricing}
      >
        <PricingFields value={pricing} onChange={setPricing} />
      </Section>

      <Section
        title="Reikalavimai vairuotojui"
        description="Bendri visiems automobiliams (kategorija ar automobilis gali griežtinti)."
        settingKey="rental_rules"
        value={() => rules}
      >
        <RulesFields value={rules} onChange={setRules} />
      </Section>

      <Section
        title="Kontaktai"
        description="Rodomi svetainėje: viršuje, poraštėje, kontaktų puslapyje ir laiškuose."
        settingKey="contacts"
        value={() => contacts}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {contactField("phone", "Telefonas", { required: true, inputMode: "tel", placeholder: "+370 600 00000" })}
          {contactField("telegram_username", "Telegram vardas (be @)", { placeholder: "balticnuoma" })}
          {contactField("email", "El. paštas klientams", { type: "email", placeholder: "info@balticnuoma.lt" })}
          <div className="sm:col-span-2">
            {contactField("address", "Adresas", { placeholder: "Birutės g. 21, Klaipėda" })}
          </div>
          <label className="flex items-start gap-3 sm:col-span-2">
            <input
              type="checkbox"
              checked={contacts.office_open}
              onChange={(e) => setContacts({ ...contacts, office_open: e.target.checked })}
              className="mt-1 size-4 accent-amber"
            />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">Biuras atidarytas lankytojams</span>
              <span className="text-xs text-muted">
                Pažymėjus — svetainėje rodomas adresas, maršrutas ir sąlygose nurodoma perdavimo vieta. Nepažymėjus —
                rašoma „Biuras laikinai uždarytas“, o automobilis perduodamas suderintoje vietoje.
              </span>
            </span>
          </label>
        </div>
      </Section>

      <Section
        title="Įmonės rekvizitai"
        description="Rodomi poraštėje ir teisiniuose puslapiuose (nuomos sąlygos, privatumo ir slapukų politika). Kol laukelis tuščias, jis nerodomas."
        settingKey="company"
        value={() => company}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {companyField("legal_name", "Juridinis pavadinimas", { placeholder: "MB Baltic Nuoma", maxLength: 120 })}
          {companyField("company_code", "Įmonės kodas", { placeholder: "300000000", maxLength: 20 })}
          {companyField("vat_code", "PVM mokėtojo kodas", { placeholder: "LT100000000000", maxLength: 20 })}
          {companyField("privacy_email", "El. paštas asmens duomenų klausimams", {
            type: "email",
            placeholder: "info@balticnuoma.lt",
          })}
          <div className="sm:col-span-2">
            {companyField("registered_address", "Buveinės (juridinis) adresas", {
              placeholder: "Birutės g. 21, LT-00000 Klaipėda",
              maxLength: 200,
            })}
          </div>
        </div>
      </Section>

      <Section
        title="Pranešimai"
        description="Kur siųsti laiškus apie naujas užklausas. Tuščia — naudojamas BOOKING_NOTIFY_EMAIL iš Vercel nustatymų."
        settingKey="notifications"
        value={() => ({ booking_email: notifyEmail.trim() || null })}
      >
        <label className="flex max-w-md flex-col gap-1.5">
          <span className={adminLabel}>Vadybininko el. paštas</span>
          <input
            type="email"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
            className={adminInput}
            placeholder="rezervacijos@balticnuoma.lt"
          />
        </label>
        <TestEmailButton />
      </Section>

      <Section
        title="Darbo laikas"
        description="Rodomas kontaktuose ir poraštėje. Dienos: I — pirmadienis … VII — sekmadienis."
        settingKey="opening_hours"
        value={() => hours}
      >
        <ul className="flex flex-col gap-3">
          {hours.map((row, i) => {
            const update = (patch: Partial<typeof row>) =>
              setHours(hours.map((r, k) => (k === i ? { ...r, ...patch } : r)));
            return (
              <li key={i} className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-bg/40 p-3">
                <fieldset className="flex flex-col gap-1.5">
                  <legend className={cn(adminLabel, "mb-1.5")}>Dienos</legend>
                  <div className="flex gap-1">
                    {DAY_LABELS.map((label, d) => {
                      const day = d + 1;
                      const on = row.days.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            update({ days: on ? row.days.filter((x) => x !== day) : [...row.days, day].sort() })
                          }
                          className={cn(
                            "h-10 w-10 rounded-lg border text-xs font-semibold transition-colors",
                            on ? "border-amber bg-amber/15 text-amber" : "border-line text-muted hover:text-fg",
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
                <label className="flex flex-col gap-1.5">
                  <span className={adminLabel}>Nuo</span>
                  <input
                    type="time"
                    value={row.opens}
                    onChange={(e) => update({ opens: e.target.value })}
                    className={cn(adminInput, "w-32")}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={adminLabel}>Iki</span>
                  <input
                    type="time"
                    value={row.closes}
                    onChange={(e) => update({ closes: e.target.value })}
                    className={cn(adminInput, "w-32")}
                  />
                </label>
                <button
                  type="button"
                  aria-label="Pašalinti eilutę"
                  onClick={() => setHours(hours.filter((_, k) => k !== i))}
                  className="grid size-11 place-items-center rounded-xl border border-line text-muted hover:border-busy/50 hover:text-busy"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => setHours([...hours, { days: [6], opens: "10:00", closes: "14:00" }])}
          className="inline-flex items-center gap-1.5 self-start text-sm text-amber hover:underline"
        >
          <Plus className="size-4" aria-hidden /> Pridėti eilutę
        </button>
      </Section>
    </div>
  );
}

/** Sends a real email to the manager address — shows Resend's exact error if it fails. */
function TestEmailButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-bg/40 p-3">
      <p className="text-sm text-muted">
        Patikrinkite, ar laiškai pasiekia vadybininką (naudojamas išsaugotas adresas).
      </p>
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => start(async () => setResult(await sendTestEmail()))}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
          Siųsti bandomąjį laišką
        </Button>
      </div>
      {result && <Notice tone={result.ok ? "success" : "error"}>{result.ok ? result.message : result.error}</Notice>}
    </div>
  );
}
