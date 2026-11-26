/* ЧЕРНОВИК: требует юридической проверки — privatumo politikos projektas (LT, BDAR). */
import { Link } from "@/i18n/navigation";
import type { LegalDocument } from "./types";
import { Email, External, Phone, Req } from "./ui";

const privacy: LegalDocument = (ctx) => [
  {
    id: "valdytojas",
    title: "Duomenų valdytojas",
    body: (
      <>
        <p>
          Jūsų asmens duomenų valdytojas — <strong>{ctx.company.name}</strong>, įmonės kodas{" "}
          <Req value={ctx.company.code} />, buveinės adresas <Req value={ctx.company.address} /> (toliau — mes).
        </p>
        <p>
          Duomenų apsaugos klausimais rašykite <Email value={ctx.privacyEmail} />, skambinkite{" "}
          <Phone display={ctx.phone} e164={ctx.phoneE164} />
          {ctx.officeOpen ? <> arba užsukite adresu {ctx.office}</> : null}.
        </p>
        <p>
          Asmens duomenis tvarkome pagal Bendrąjį duomenų apsaugos reglamentą (BDAR, (ES) 2016/679) ir Lietuvos
          Respublikos asmens duomenų teisinės apsaugos įstatymą.
        </p>
      </>
    ),
  },
  {
    id: "kokius-duomenis",
    title: "Kokius duomenis tvarkome",
    body: (
      <ul>
        <li>
          <strong>Rezervacijos užklausa svetainėje:</strong> vardas, pavardė, telefono numeris, el. pašto adresas,
          vairuotojo pažymėjimo išdavimo metai, pasirinktas automobilis, nuomos laikotarpis ir kaina, jūsų komentaras,
          sutikimo su nuomos sąlygomis laikas ir svetainės kalba.
        </li>
        <li>
          <strong>Užklausa telefonu ar žinute:</strong> duomenys, kuriuos pateikiate pokalbio metu (darbuotojas juos
          įrašo į rezervacijų sistemą).
        </li>
        <li>
          <strong>Nuomos sutartis:</strong> asmens tapatybės dokumento ir vairuotojo pažymėjimo duomenys, gimimo data,
          adresas, mokėjimų ir užstato informacija, automobilio perdavimo ir grąžinimo duomenys (rida, būklė,
          nuotraukos), eismo įvykių, žalos ir baudų duomenys.
        </li>
        <li>
          <strong>Bendravimas:</strong> susirašinėjimas el. paštu ir kitomis žinutėmis, skambučių informacija.
        </li>
        <li>
          <strong>Techniniai duomenys:</strong> siekdami apsisaugoti nuo piktnaudžiavimo užklausų forma, saugome tik
          užšifruotą (negrįžtamai „sumaišytą“) IP adreso reikšmę. Svetainės talpinimo paslaugos teikėjo serverių
          žurnaluose trumpai saugomi IP adresas, naršyklės tipas ir užklausų laikas.
        </li>
        <li>
          <strong>Slapukai:</strong> žr. <Link href="/slapukai">slapukų politiką</Link>.
        </li>
      </ul>
    ),
  },
  {
    id: "tikslai-ir-pagrindai",
    title: "Tikslai ir teisiniai pagrindai",
    body: (
      <ul>
        <li>
          <strong>Užklausų nagrinėjimas, rezervacija, nuomos sutarties sudarymas ir vykdymas</strong>, įskaitant
          pranešimus el. paštu apie užklausos būseną — sutartis arba veiksmai prieš ją sudarant (BDAR 6 str. 1 d. b p.).
        </li>
        <li>
          <strong>Apskaita, mokesčiai, atsakymai institucijoms</strong> (pvz., dėl baudų) — teisinė prievolė (BDAR 6
          str. 1 d. c p.).
        </li>
        <li>
          <strong>
            Svetainės saugumas, piktnaudžiavimo prevencija, turto apsauga, reikalavimų pareiškimas ir gynimas
          </strong>{" "}
          — teisėtas interesas (BDAR 6 str. 1 d. f p.).
        </li>
        <li>
          <strong>Žemėlapis{ctx.analytics && " ir lankomumo statistika"}</strong> — jūsų sutikimas (BDAR 6 str. 1 d. a
          p.), kurį galite bet kada atšaukti.
        </li>
      </ul>
    ),
  },
  {
    id: "saugojimo-terminai",
    title: "Kiek laiko saugome duomenis",
    body: (
      <ul>
        <li>
          Užklausų, nuomos ir susirašinėjimo duomenys — 6 mėnesius nuo nuomos pabaigos, o jei sutartis nesudaryta, — 6
          mėnesius nuo užklausos.
        </li>
        <li>
          Ilgiau saugome tik tai, ką privaloma saugoti pagal teisės aktus (pvz., apskaitos dokumentus — teisės aktų
          nustatytą laiką), arba tai, ko reikia neišspręstam ginčui ar reikalavimui, — iki jo išsprendimo.
        </li>
        <li>Užklausų skaičiavimo įrašai (piktnaudžiavimo prevencija) — ne ilgiau kaip 24 valandas.</li>
        <li>Serverių žurnalai — paslaugų teikėjo nustatytą laiką, paprastai iki 30 dienų.</li>
      </ul>
    ),
  },
  {
    id: "gavejai",
    title: "Kam teikiame duomenis",
    body: (
      <>
        <p>Duomenis tvarko mūsų pasitelkti paslaugų teikėjai (duomenų tvarkytojai):</p>
        <ul>
          <li>svetainės talpinimas — Vercel Inc.;</li>
          <li>duomenų bazė ir failų saugykla — Supabase Inc.;</li>
          <li>el. laiškų siuntimas — Resend;</li>
          <li>Google (Google Maps žemėlapis{ctx.analytics && " ir Google Analytics"}) — tik jums sutikus;</li>
          <li>apskaitos ir IT paslaugų teikėjai.</li>
        </ul>
        <p>
          Kai to reikia pagal teisės aktus ar sutartį, duomenis teikiame draudimo bendrovėms, policijai, teismams,
          kitoms valstybės institucijoms ir skolų išieškojimo įmonėms.
        </p>
        <p>
          Kai kurie paslaugų teikėjai yra už Europos ekonominės erdvės ribų (pvz., JAV). Tokiu atveju duomenys
          perduodami taikant ES ir JAV duomenų privatumo sistemą ir (ar) Europos Komisijos patvirtintas standartines
          sutarčių sąlygas.
        </p>
      </>
    ),
  },
  {
    id: "jusu-teises",
    title: "Jūsų teisės",
    body: (
      <>
        <p>Jūs turite teisę:</p>
        <ul>
          <li>susipažinti su savo duomenimis ir gauti jų kopiją;</li>
          <li>reikalauti ištaisyti netikslius duomenis;</li>
          <li>reikalauti ištrinti duomenis, kai jų nebereikia arba juos tvarkyti nėra pagrindo;</li>
          <li>apriboti duomenų tvarkymą;</li>
          <li>gauti duomenis, kuriuos pateikėte, susistemintu formatu (perkeliamumas);</li>
          <li>nesutikti, kad duomenys būtų tvarkomi teisėto intereso pagrindu;</li>
          <li>
            bet kada atšaukti sutikimą — pavyzdžiui, per „Slapukų nustatymus“ svetainės poraštėje (tai neturi įtakos iki
            atšaukimo atliktam tvarkymui).
          </li>
        </ul>
        <p>
          Prašymus siųskite <Email value={ctx.privacyEmail} />. Atsakome ne vėliau kaip per vieną mėnesį; prieš
          vykdydami prašymą galime paprašyti patvirtinti jūsų tapatybę.
        </p>
        <p>
          Jei manote, kad jūsų duomenys tvarkomi pažeidžiant teisės aktus, galite pateikti skundą Valstybinei duomenų
          apsaugos inspekcijai (<External href="https://vdai.lrv.lt">vdai.lrv.lt</External>).
        </p>
      </>
    ),
  },
  {
    id: "saugumas",
    title: "Duomenų saugumas",
    body: (
      <p>
        Duomenys perduodami šifruotu ryšiu (HTTPS), prieiga prie rezervacijų sistemos suteikiama tik įgaliotiems
        darbuotojams ir apsaugota slaptažodžiais, o duomenų bazėje taikomos prieigos teisių taisyklės. Atsarginės
        kopijos daromos reguliariai.
      </p>
    ),
  },
  {
    id: "automatizuoti-sprendimai",
    title: "Automatizuoti sprendimai",
    body: <p>Sprendimų vien automatizuotu būdu nepriimame ir profiliavimo nevykdome.</p>,
  },
  {
    id: "politikos-keitimas",
    title: "Politikos keitimas",
    body: (
      <p>
        Šią politiką galime atnaujinti. Nauja redakcija skelbiama šiame puslapyje, o esminius pakeitimus papildomai
        pažymime svetainėje.
      </p>
    ),
  },
];

export default privacy;
