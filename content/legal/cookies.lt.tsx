/* ЧЕРНОВИК: требует юридической проверки — slapukų politikos projektas (LT). */
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
      provider: "Ši svetainė",
      purpose: "Įsimena pasirinktą svetainės kalbą.",
      duration: "Iki naršyklės uždarymo",
      category: "Būtinas",
    },
    {
      name: CONSENT_COOKIE,
      provider: "Ši svetainė",
      purpose: "Įsimena jūsų slapukų pasirinkimą.",
      duration: "12 mėn.",
      category: "Būtinas",
    },
    {
      name: "sb-…-auth-token",
      provider: "Ši svetainė",
      purpose: "Darbuotojų prisijungimas prie administravimo sistemos (nustatomas tik darbuotojams).",
      duration: "Iki atsijungimo, ne ilgiau kaip 400 d.",
      category: "Būtinas",
    },
    {
      name: "NID, AEC, SOCS ir kt.",
      provider: "Google",
      purpose: "Google Maps žemėlapio veikimas, nustatymai ir saugumas.",
      duration: "Iki 13 mėn.",
      category: "Žemėlapis — tik su sutikimu",
    },
    ...(ctx.analytics
      ? [
          {
            name: "_ga, _ga_*",
            provider: "Google",
            purpose: "Google Analytics: lankytojų ir apsilankymų skaičiavimas.",
            duration: "Iki 2 metų",
            category: "Analitika — tik su sutikimu",
          },
        ]
      : []),
  ];

  return [
    {
      id: "kas-yra-slapukai",
      title: "Kas yra slapukai",
      body: (
        <p>
          Slapukai — tai nedideli tekstiniai failai, kuriuos svetainė įrašo jūsų naršyklėje. Jie padeda svetainei veikti
          (pvz., įsiminti kalbą) arba, jums sutikus, įkelti trečiųjų šalių turinį ir rinkti statistiką.
        </p>
      ),
    },
    {
      id: "kokius-naudojame",
      title: "Kokius slapukus naudojame",
      body: (
        <>
          <p>
            <strong>Būtinieji slapukai</strong> reikalingi, kad svetainė veiktų, todėl jiems sutikimo nereikia.{" "}
            <strong>Kiti slapukai</strong> įrašomi tik jums sutikus.
          </p>
          <CookieTable
            label="Naudojamų slapukų lentelė"
            head={{
              name: "Slapukas",
              provider: "Teikėjas",
              purpose: "Paskirtis",
              duration: "Galiojimas",
              category: "Kategorija",
            }}
            rows={rows}
          />
          {!ctx.analytics && (
            <p>
              Šiuo metu analitikos ir reklamos slapukų nenaudojame. Jei pradėsime, atnaujinsime šią politiką ir
              paprašysime jūsų sutikimo.
            </p>
          )}
        </>
      ),
    },
    {
      id: "sutikimo-valdymas",
      title: "Kaip valdyti sutikimą",
      body: (
        <>
          <p>
            Pirmą kartą apsilankius svetainėje rodomas pranešimas, kuriame galite priimti visus slapukus, palikti tik
            būtinuosius arba pasirinkti kategorijas. Kol nepasirinkote, neprivalomi slapukai neįrašomi. Pasirinkimą
            galite bet kada pakeisti:
          </p>
          <p>
            <CookieSettingsButton className={buttonClasses({ variant: "secondary", size: "sm" })} />
          </p>
          <p>
            Slapukus taip pat galite ištrinti ar užblokuoti naršyklės nustatymuose. Užblokavus būtinuosius slapukus,
            dalis svetainės funkcijų gali neveikti.
          </p>
        </>
      ),
    },
    {
      id: "treciosios-salys",
      title: "Trečiųjų šalių slapukai",
      body: (
        <p>
          Google slapukus tvarko Google pagal savo taisykles — žr.{" "}
          <External href="https://policies.google.com/technologies/cookies">Google slapukų naudojimas</External> ir{" "}
          <External href="https://policies.google.com/privacy">Google privatumo politika</External>. Kaip tvarkome
          asmens duomenis, rasite <Link href="/privatumo-politika">privatumo politikoje</Link>.
        </p>
      ),
    },
    {
      id: "kontaktai",
      title: "Kontaktai ir pakeitimai",
      body: (
        <p>
          Klausimus apie slapukus siųskite <Email value={ctx.privacyEmail} />. Šią politiką galime atnaujinti — nauja
          redakcija skelbiama šiame puslapyje.
        </p>
      ),
    },
  ];
};

export default cookies;
