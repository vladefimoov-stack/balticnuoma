/* ЧЕРНОВИК: требует юридической проверки — nuomos sąlygų projektas (LT), suderintas su nuomos sutarties projektu. */
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
          <Req value={ctx.company.address} />; toliau — Nuomotojas). Automobiliai išnuomojami fiziniams ir juridiniams
          asmenims.
        </p>
        <p>
          {ctx.officeOpen
            ? `Automobiliai perduodami ir grąžinami adresu ${ctx.office}.`
            : "Automobiliai perduodami ir grąžinami iš anksto suderintoje vietoje Klaipėdoje."}{" "}
          Kontaktai: tel. <Phone display={ctx.phone} e164={ctx.phoneE164} />, el. paštas <Email value={ctx.email} />.
        </p>
        <p>
          Nuomos santykius galutinai nustato perduodant automobilį pasirašoma nuomos sutartis, priėmimo–perdavimo aktas
          ir kainoraštis. Jei sutartyje susitarta kitaip nei šiose sąlygose, taikoma sutartis.
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
      </>
    ),
  },
  {
    id: "reikalavimai",
    title: "Reikalavimai nuomininkui ir vairuotojams",
    body: (
      <ul>
        <li>
          Vairuotojui turi būti ne mažiau kaip <strong>{ctx.rules.min_age} metų</strong>, jis turi turėti galiojantį B
          kategorijos vairuotojo pažymėjimą ne trumpiau kaip <strong>{ctx.rules.min_license_years} metus</strong>.
          Atskiriems automobiliams reikalavimai gali būti griežtesni — jie nurodyti prie automobilio.
        </li>
        <li>
          Perduodant automobilį pateikiamas asmens tapatybės dokumentas (asmens tapatybės kortelė arba pasas) ir
          vairuotojo pažymėjimas. Juridiniai asmenys papildomai pateikia rekvizitus ir atstovavimą patvirtinantį
          dokumentą.
        </li>
        <li>
          Automobilį vairuoti gali tik sutartyje nurodyti vairuotojai. Papildomas vairuotojas turi atitikti tuos pačius
          reikalavimus; už jo veiksmus nuomininkas atsako kaip už savo.
        </li>
        <li>
          Nuomotojas gali atsisakyti išnuomoti automobilį, jei asmuo neatitinka reikalavimų, pateikia neteisingus
          duomenis arba yra apsvaigęs.
        </li>
      </ul>
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
          Į kainą įskaičiuotas privalomasis transporto priemonių valdytojų civilinės atsakomybės draudimas ir planinė
          techninė priežiūra. Ridos limitas netaikomas, nebent jis nurodytas prie automobilio. Degalus apmoka
          nuomininkas.
        </p>
        <ul>
          <li>Kai nuomos laikotarpis 2 mėnesiai ar trumpesnis, visa kaina sumokama perduodant automobilį.</li>
          <li>
            Kai nuomos laikotarpis ilgesnis nei 2 mėnesiai, perduodant automobilį sumokama už pirmuosius 2 mėnesius, o
            automobilis rezervuojamas visam laikotarpiui; vėliau mokama kas mėnesį iš anksto.
          </li>
          <li>Pavėlavus sumokėti, skaičiuojami 0,1 % dydžio delspinigiai už kiekvieną pavėluotą dieną.</li>
        </ul>
        <p>
          Atsiskaityti galima mokėjimo kortele arba grynaisiais pinigais; įmonės gali mokėti pavedimu pagal sąskaitą
          faktūrą.
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
          Grąžinimo metu automobilį apžiūrime kartu su jumis. Jei sutartis nepažeista ir įsiskolinimų nėra, užstatą
          grąžiname per 1–3 dienas tuo pačiu būdu, kuriuo jis buvo sumokėtas.
        </p>
        <p>Iš užstato išskaičiuojama:</p>
        <ul>
          <li>bauda už pavėluotą grąžinimą: iki 1 paros — 50 €, daugiau kaip 1 parą — 100 €;</li>
          <li>trūkstami degalai — degalinės kaina už litrą ir 30 € paslaugos mokestis;</li>
          <li>
            nešvarus automobilis — 50 € ir plovimo kaina; cheminis valymas (rūkymas, gyvūnai, išteptas salonas) — 100 €
            ir valymo kaina;
          </li>
          <li>
            salono, kėbulo, padangų, ratlankių, stiklų ar kitų dalių sugadinimų pašalinimo kaina, taip pat sugadinimų,
            kurių kaltininko nustatyti nepavyksta (pvz., automobilis apgadintas stovėjimo aikštelėje);
          </li>
          <li>pamestas ar sugadintas raktas — jo kaina, bet ne mažiau kaip 200 €, ir 70 € už darbą;</li>
          <li>nuomos laikotarpiu gautos baudos ir 30 € administravimo mokestis už kiekvieną baudą.</li>
        </ul>
        <p>
          Užstatas negrąžinamas, jei automobilis išvežamas už Lietuvos ribų be atskiro rašytinio susitarimo su Nuomotoju
          arba negrąžinamas ilgiau kaip 3 dienas po sutarto termino. Jei užstato nepakanka, nuomininkas trūkstamą sumą
          sumoka per 5 darbo dienas nuo Nuomotojo pareikalavimo.
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
            : "Automobilio perdavimo ir grąžinimo laikas bei vieta suderinami patvirtinant rezervaciją."}{" "}
          Automobilį galima pristatyti į kitą vietą susitarus; kaina priklauso nuo atstumo.
        </li>
        <li>
          Perduodant ir grąžinant automobilio būklė, rida ir degalų kiekis fiksuojami priėmimo–perdavimo akte, daromos
          nuotraukos. Pastebėję akte nepažymėtų sugadinimų, praneškite prieš pradėdami važiuoti.
        </li>
        <li>
          Automobilis grąžinamas sutartu laiku, su tokiu pačiu degalų kiekiu, švarus, su visa komplektacija, raktais ir
          registracijos liudijimu.
        </li>
        <li>
          Pavėlavus grąžinti, be baudos už faktinį naudojimosi laiką mokama pagal tarifus; apie vėlavimą praneškite iš
          anksto. Jei automobilis negrąžinamas ilgiau kaip 3 dienas, kreipiamės į teisėsaugos institucijas.
        </li>
        <li>
          Nuomą pratęsti galima tik iš anksto susitarus ir tik jei automobilis tuo laikotarpiu nerezervuotas; priešingu
          atveju automobilis grąžinamas sutartu laiku.
        </li>
        <li>Grąžinus automobilį anksčiau, kaina už nepanaudotą laiką negrąžinama, nebent susitarta kitaip.</li>
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
          Nuomininkas ir vairuotojai naudoja automobilį rūpestingai, laikosi Kelių eismo taisyklių, palieka automobilį
          užrakintą ir nepalieka jame raktų bei dokumentų. Draudžiama:
        </p>
        <ul>
          <li>vairuoti apsvaigus nuo alkoholio, narkotinių, psichotropinių ar kitų psichiką veikiančių medžiagų;</li>
          <li>rūkyti automobilyje (taip pat elektronines cigaretes) ir be Nuomotojo sutikimo vežti gyvūnus;</li>
          <li>
            dalyvauti lenktynėse, treniruotėse, mokyti vairuoti, važiuoti bekele, vilkti kitas transporto priemones ar
            priekabas;
          </li>
          <li>subnuomoti automobilį ar leisti jį vairuoti sutartyje nenurodytiems asmenims;</li>
          <li>naudoti automobilį kurjerių paslaugoms ar kitai komercinei veiklai be raštiško Nuomotojo sutikimo;</li>
          <li>išvykti už Lietuvos ribų be atskiro rašytinio susitarimo su Nuomotoju.</li>
        </ul>
        <p>
          Užsidegus įspėjamajai lemputei ar pastebėjus gedimą, nedelsdami praneškite mums ir nevažiuokite toliau, jei
          tai gali pakenkti automobiliui. Remontuoti automobilį be Nuomotojo sutikimo draudžiama. Ilgalaikės nuomos
          atveju nuomininkas pristato automobilį techninei priežiūrai mūsų nurodytu laiku; planinės priežiūros išlaidas
          apmokame mes.
        </p>
        <p>
          Automobiliuose įrengti GPS sekimo įrenginiai, gali būti įrengti vaizdo registratoriai — jų išjungti ar
          pašalinti negalima. Kaip tvarkome šiuos duomenis, rasite{" "}
          <Link href="/privatumo-politika">privatumo politikoje</Link>.
        </p>
      </>
    ),
  },
  {
    id: "draudimas-ir-atsakomybe",
    title: "Draudimas ir atsakomybė",
    body: (
      <>
        <p>
          Automobiliai apdrausti tik privalomuoju transporto priemonių valdytojų civilinės atsakomybės draudimu, kuris
          atlygina tretiesiems asmenims padarytą žalą. Paties automobilio sugadinimai (KASKO) neapdrausti.
        </p>
        <p>
          Todėl nuomininkas atsako už automobilio praradimą ar sugadinimą nuomos laikotarpiu ir atlygina Nuomotojo
          nuostolius, išskyrus atvejus, kai žala atsirado dėl automobilio gedimo, už kurį nuomininkas neatsako. Už
          pamestus dokumentus ar valstybinius numerius sumokama jų atkūrimo kaina ir 70 €.
        </p>
        <p>
          Nuomotojas atsako, kad perduodamas automobilis būtų techniškai tvarkingas ir apdraustas privalomuoju draudimu.
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
          Įvykus bet kokiam eismo įvykiui, nedelsdami iškvieskite policiją (tel. 112), kuo greičiau praneškite
          Nuomotojui, nufotografuokite vietą ir, jei taikoma, užpildykite eismo įvykio deklaraciją.
        </li>
        <li>
          Jei automobilis sugenda ne dėl nuomininko kaltės, suteikiame visą įmanomą pagalbą: esant laisvam automobiliui
          — jį pakeičiame, o nesant — grąžiname sumą už nepanaudotą laiką ir savo sąskaita evakuojame automobilį. Jei
          gedimas ar įvykis atsirado dėl nuomininko kaltės, evakavimo ir remonto išlaidas apmoka nuomininkas.
        </li>
        <li>
          Nuomos laikotarpiu gautas baudas ir rinkliavas apmoka nuomininkas. Turime teisę pateikti nuomininko duomenis
          baudą skyrusiai institucijai; už kiekvienos baudos administravimą taikomas 30 € mokestis.
        </li>
      </ul>
    ),
  },
  {
    id: "atsaukimas-ir-nutraukimas",
    title: "Atšaukimas ir sutarties nutraukimas",
    body: (
      <>
        <p>
          Užklausą ar patvirtintą rezervaciją galite atšaukti iki automobilio perdavimo — sumokėtas išankstinis
          mokėjimas grąžinamas. Praneškite mums kuo anksčiau.
        </p>
        <p>
          Nuomotojas gali nedelsdamas nutraukti sutartį ir susigrąžinti automobilį, jei nuomininkas laiku nesumoka,
          pažeidžia naudojimosi taisykles, leidžia vairuoti sutartyje nenurodytiems asmenims ar kitaip iš esmės
          pažeidžia sutartį. Tokiu atveju užstatas grąžinamas tik tiek, kiek jo nereikia nuostoliams padengti.
        </p>
      </>
    ),
  },
  {
    id: "asmens-duomenys",
    title: "Asmens duomenys",
    body: (
      <p>
        Asmens duomenis, įskaitant GPS ir vaizdo registratorių duomenis, tvarkome pagal{" "}
        <Link href="/privatumo-politika">privatumo politiką</Link>, o svetainės slapukus — pagal{" "}
        <Link href="/slapukai">slapukų politiką</Link>.
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
          derybomis — parašykite mums <Email value={ctx.email} />. Nepavykus susitarti, ginčai sprendžiami Lietuvos
          Respublikos teismuose Klaipėdoje, išskyrus atvejus, kai įstatymai vartotojams nustato kitą teismingumą.
        </p>
        <p>
          Vartotojas taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą (
          <External href="https://www.vvtat.lt">www.vvtat.lt</External>).
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
