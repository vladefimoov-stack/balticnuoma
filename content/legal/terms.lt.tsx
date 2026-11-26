/* ЧЕРНОВИК: требует юридической проверки — nuomos sąlygų projektas (LT). */
import { Link } from "@/i18n/navigation";
import type { LegalDocument } from "./types";
import { Email, External, Phone, Req } from "./ui";

const terms: LegalDocument = (ctx) => [
  {
    id: "bendrosios-nuostatos",
    title: "Bendrosios nuostatos",
    body: (
      <>
        <p>
          Šios sąlygos taikomos automobilių nuomai iš <strong>{ctx.company.name}</strong> (įmonės kodas{" "}
          <Req value={ctx.company.code} />
          {ctx.company.vat && <>, PVM mokėtojo kodas {ctx.company.vat}</>}, buveinės adresas{" "}
          <Req value={ctx.company.address} />; toliau — Nuomotojas). Automobiliai išnuomojami asmeninėms reikmėms.
        </p>
        <p>
          {ctx.officeOpen
            ? `Automobiliai perduodami ir grąžinami adresu ${ctx.office}.`
            : "Automobiliai perduodami ir grąžinami iš anksto suderintoje vietoje Klaipėdoje."}{" "}
          Kontaktai: tel. <Phone display={ctx.phone} e164={ctx.phoneE164} />, el. paštas <Email value={ctx.email} />.
        </p>
        <p>
          Nuomos santykius galutinai nustato perduodant automobilį pasirašoma nuomos sutartis ir priėmimo–perdavimo
          aktas. Jei sutartyje susitarta kitaip nei šiose sąlygose, taikoma sutartis.
        </p>
        <p>
          <strong>Nuomininkas</strong> — fizinis ar juridinis asmuo, sudaręs nuomos sutartį.{" "}
          <strong>Vairuotojas</strong> — sutartyje nurodytas asmuo, kuriam leidžiama vairuoti automobilį.
        </p>
      </>
    ),
  },
  {
    id: "uzklausa-ir-rezervacija",
    title: "Užklausa ir rezervacijos patvirtinimas",
    body: (
      <>
        <p>
          Svetainėje pateikta užklausa dar nėra rezervacija ir automobilio neužima. Gavę užklausą susisiekiame su jumis
          telefonu arba el. paštu ir ją patvirtiname arba atmetame.
        </p>
        <p>
          Rezervacija galioja tik tada, kai ją patvirtiname (atsiunčiame patvirtinimo laišką arba patvirtiname
          telefonu). Tam pačiam laikotarpiui gali būti pateikta kelių klientų užklausų — automobilis skiriamas vienam iš
          jų.
        </p>
        <p>
          Svetainėje rodoma kaina apskaičiuojama pagal užklausos metu galiojančius tarifus ir yra preliminari. Galutinė
          kaina nurodoma nuomos sutartyje.
        </p>
        <p>
          Užklausą ar patvirtintą rezervaciją galite atšaukti nemokamai, kol automobilis dar neperduotas, — tiesiog
          praneškite mums kuo anksčiau.
        </p>
      </>
    ),
  },
  {
    id: "reikalavimai",
    title: "Reikalavimai nuomininkui ir vairuotojams",
    body: (
      <>
        <ul>
          <li>
            Vairuotojui turi būti ne mažiau kaip <strong>{ctx.rules.min_age} metų</strong>, jis turi turėti galiojantį B
            kategorijos vairuotojo pažymėjimą ne trumpiau kaip <strong>{ctx.rules.min_license_years} metus</strong>.
            Atskiriems automobiliams (pvz., prabangos klasės) reikalavimai gali būti griežtesni — jie nurodyti prie
            automobilio.
          </li>
          <li>
            Perduodant automobilį pateikiamas asmens tapatybės dokumentas (asmens tapatybės kortelė arba pasas) ir
            vairuotojo pažymėjimas. Juridiniai asmenys papildomai pateikia rekvizitus ir atstovavimą patvirtinantį
            dokumentą.
          </li>
          <li>
            Automobilį vairuoti gali tik sutartyje nurodyti vairuotojai. Papildomas vairuotojas turi atitikti tuos
            pačius reikalavimus.
          </li>
          <li>
            Nuomotojas gali atsisakyti išnuomoti automobilį, jei asmuo neatitinka reikalavimų, pateikia neteisingus
            duomenis arba yra apsvaigęs.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "kaina-ir-mokejimas",
    title: "Kaina ir mokėjimas",
    body: (
      <>
        <p>
          Kaina skaičiuojama pagal prie automobilio nurodytus tarifus (valandinį, paros, savaitės ar ilgalaikės nuomos).
          Kai nuomos trukmei tinka keli tarifai, taikomas palankiausias.
        </p>
        <p>
          Į kainą įskaičiuotas privalomasis transporto priemonių valdytojų civilinės atsakomybės draudimas ir techninė
          priežiūra. Degalus (elektromobiliams — įkrovimą) apmoka nuomininkas. Automobilis grąžinamas su tokiu pat
          degalų kiekiu, kokiu buvo perduotas; trūkstami degalai apmokami sutartyje nustatyta tvarka.
        </p>
        <p>
          Jei prie automobilio nurodytas paros ridos limitas, už jį viršijusius kilometrus mokama pagal sutartyje
          nurodytą įkainį.
        </p>
        <p>
          Atsiskaityti galima mokėjimo kortele arba grynaisiais pinigais; mokėjimo terminai nurodomi sutartyje. Įmonėms
          išrašome sąskaitas faktūras.
        </p>
      </>
    ),
  },
  {
    id: "uzstatas",
    title: "Užstatas",
    body: (
      <>
        <p>Perduodant automobilį sumokamas užstatas. Jo dydis nurodytas prie kiekvieno automobilio.</p>
        <p>
          Grąžinimo metu automobilį apžiūrime kartu su jumis. Jei naujų pažeidimų, baudų ar kitų įsiskolinimų nėra,
          užstatą grąžiname per 1–3 dienas tuo pačiu būdu, kuriuo jis buvo sumokėtas.
        </p>
        <p>Iš užstato išskaičiuojama:</p>
        <ul>
          <li>bauda už pavėluotą automobilio grąžinimą;</li>
          <li>
            naudojimosi taisyklių pažeidimų pašalinimo kaina — pagal faktines cheminio valymo, serviso, remonto ar kitų
            reikalingų darbų išlaidas (pvz., rūkymas ar gyvūnai salone, užterštas automobilis, trūkstami degalai);
          </li>
          <li>
            automobilio sugadinimai (sutartyje nustatytose ribose), baudos ir kitos pagal sutartį mokėtinos sumos.
          </li>
        </ul>
        <p>
          Išvykus už Lietuvos ribų be išankstinio raštiško Nuomotojo sutikimo, užstatas negrąžinamas. Jei užstato
          nepakanka nuostoliams padengti, nuomininkas sumoka trūkstamą sumą.
        </p>
      </>
    ),
  },
  {
    id: "perdavimas-ir-grazinimas",
    title: "Automobilio perdavimas ir grąžinimas",
    body: (
      <ul>
        <li>
          {ctx.officeOpen
            ? `Automobilis perduodamas ir grąžinamas adresu ${ctx.office} darbo laiku, jei nesusitarta kitaip.`
            : "Automobilio perdavimo ir grąžinimo laikas bei vieta suderinami patvirtinant rezervaciją."}
        </li>
        <li>
          Perduodant ir grąžinant automobilio būklė, rida ir degalų kiekis fiksuojami priėmimo–perdavimo akte, gali būti
          daromos nuotraukos.
        </li>
        <li>
          Automobilis grąžinamas sutartu laiku, tvarkingas ir be asmeninių daiktų. Už pavėluotą grąžinimą taikoma bauda,
          kuri išskaičiuojama iš užstato. Jei vėluojate, praneškite mums iš anksto.
        </li>
        <li>Nuomą galima pratęsti iš anksto susitarus, jei automobilis tuo metu laisvas.</li>
        <li>Nuomotojas neatsako už automobilyje paliktus daiktus.</li>
      </ul>
    ),
  },
  {
    id: "naudojimosi-taisykles",
    title: "Naudojimosi automobiliu taisyklės",
    body: (
      <>
        <p>
          Nuomininkas ir vairuotojai naudoja automobilį rūpestingai, laikosi Kelių eismo taisyklių ir automobilio
          nenaudoja:
        </p>
        <ul>
          <li>vairuodami apsvaigę nuo alkoholio, narkotinių, psichotropinių ar kitų psichiką veikiančių medžiagų;</li>
          <li>lenktynėms, treniruotėms, mokymui vairuoti ar važiavimui bekelėje;</li>
          <li>kitų transporto priemonių ar priekabų vilkimui be Nuomotojo sutikimo;</li>
          <li>komercinei veiklai be raštiško Nuomotojo sutikimo;</li>
          <li>perduodami vairuoti sutartyje nenurodytiems asmenims ar subnuomodami;</li>
          <li>
            išvykdami už Lietuvos ribų be išankstinio raštiško Nuomotojo sutikimo (tokiu atveju užstatas negrąžinamas).
          </li>
        </ul>
        <p>
          Automobilyje draudžiama rūkyti (taip pat elektronines cigaretes) ir be Nuomotojo sutikimo vežti gyvūnus.
          Pažeidus šias taisykles, iš užstato išskaičiuojama cheminio valymo ar kitų reikalingų darbų kaina.
        </p>
      </>
    ),
  },
  {
    id: "ivykiai-gedimai-baudos",
    title: "Eismo įvykiai, gedimai ir baudos",
    body: (
      <ul>
        <li>
          Įvykus eismo įvykiui, nedelsdami praneškite Nuomotojui, prireikus kvieskite policiją (tel. 112), užpildykite
          eismo įvykio deklaraciją ir nufotografuokite vietą.
        </li>
        <li>
          Užsidegus įspėjamajam signalui ar sugedus automobiliui, nevažiuokite toliau, jei tai gali pakenkti
          automobiliui, ir susisiekite su mumis. Remontuoti automobilį ar keisti jo dalis be Nuomotojo sutikimo
          draudžiama.
        </li>
        <li>
          Nuomos laikotarpiu gautas baudas, stovėjimo ir kelių naudotojo mokesčius apmoka nuomininkas. Jei apie baudą
          sužinome vėliau, turime teisę pateikti nuomininko duomenis ją skyrusiai institucijai arba reikalauti sumokėti
          baudos sumą.
        </li>
      </ul>
    ),
  },
  {
    id: "atsakomybe",
    title: "Atsakomybė",
    body: (
      <>
        <p>
          Nuomininkas atsako už automobilio praradimą ar sugadinimą nuomos laikotarpiu, išskyrus atvejus, kai žala
          atsirado dėl gedimo, už kurį nuomininkas neatsako. Atsakomybės ribos ir draudimo išskaitos (franšizės)
          nustatomos nuomos sutartyje.
        </p>
        <p>
          Visa atsakomybė taikoma, jei žala padaryta tyčia, vairuojant apsvaigus, pažeidus naudojimosi taisykles ar
          vairuojant sutartyje nenurodytam asmeniui.
        </p>
        <p>
          Nuomotojas atsako, kad perduodamas automobilis būtų techniškai tvarkingas ir apdraustas privalomuoju draudimu.
          Jei automobilis sugenda ne dėl nuomininko kaltės, stengiamės pasiūlyti kitą automobilį arba grąžiname sumą už
          nepanaudotą nuomos laiką.
        </p>
      </>
    ),
  },
  {
    id: "asmens-duomenys",
    title: "Asmens duomenys",
    body: (
      <p>
        Asmens duomenis tvarkome pagal <Link href="/privatumo-politika">privatumo politiką</Link>, o svetainės slapukus
        — pagal <Link href="/slapukai">slapukų politiką</Link>.
      </p>
    ),
  },
  {
    id: "gincai",
    title: "Ginčų sprendimas",
    body: (
      <>
        <p>
          Šioms sąlygoms ir nuomos sutarčiai taikoma Lietuvos Respublikos teisė. Ginčus pirmiausia stengiamės spręsti
          derybomis — parašykite mums <Email value={ctx.email} />.
        </p>
        <p>
          Vartotojas taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą (
          <External href="https://www.vvtat.lt">www.vvtat.lt</External>) arba į teismą.
        </p>
      </>
    ),
  },
  {
    id: "salygu-keitimas",
    title: "Sąlygų keitimas",
    body: (
      <p>
        Nuomotojas gali keisti šias sąlygas. Nauja redakcija skelbiama šiame puslapyje ir taikoma po jos paskelbimo
        sudarytoms sutartims.
      </p>
    ),
  },
];

export default terms;
