/* ЧЕРНОВИК: требует юридической проверки — draft rental terms (EN). The LT version prevails. */
import { Link } from "@/i18n/navigation";
import type { LegalDocument } from "./types";
import { Email, External, Phone, Req } from "./ui";

const terms: LegalDocument = (ctx) => [
  {
    id: "general",
    title: "General provisions",
    body: (
      <>
        <p>
          These terms apply to car rental from <strong>{ctx.company.name}</strong> (company code{" "}
          <Req value={ctx.company.code} />
          {ctx.company.vat && <>, VAT code {ctx.company.vat}</>}, registered address <Req value={ctx.company.address} />
          ; the “Lessor”). Cars are rented for personal use.
        </p>
        <p>
          {ctx.officeOpen
            ? `Cars are handed over and returned at ${ctx.office}.`
            : "Cars are handed over and returned at a place in Klaipėda agreed in advance."}{" "}
          Contacts: phone <Phone display={ctx.phone} e164={ctx.phoneE164} />, email <Email value={ctx.email} />.
        </p>
        <p>
          The rental is finally governed by the rental agreement and the handover report signed when you collect the
          car. Where the agreement differs from these terms, the agreement prevails. If the Lithuanian and English
          versions of these terms differ, the Lithuanian version prevails.
        </p>
        <p>
          The <strong>renter</strong> is the person or company that signs the rental agreement. A{" "}
          <strong>driver</strong> is a person named in the agreement who may drive the car.
        </p>
      </>
    ),
  },
  {
    id: "request-and-booking",
    title: "Requests and booking confirmation",
    body: (
      <>
        <p>
          A request sent on the website is not yet a booking and does not reserve the car. Once we receive it, we
          contact you by phone or email and confirm or decline it.
        </p>
        <p>
          A booking is valid only once we confirm it (by a confirmation email or by phone). Several customers may
          request the same dates — the car is assigned to one of them.
        </p>
        <p>
          The price shown on the website is calculated from the tariffs valid at the time of the request and is
          preliminary. The final price is stated in the rental agreement.
        </p>
        <p>
          You can cancel a request or a confirmed booking free of charge until the car is handed over — just let us know
          as early as possible.
        </p>
      </>
    ),
  },
  {
    id: "requirements",
    title: "Requirements for the renter and drivers",
    body: (
      <ul>
        <li>
          A driver must be at least <strong>{ctx.rules.min_age} years old</strong> and have held a valid category B
          driving licence for at least <strong>{ctx.rules.min_license_years} years</strong>. Some cars (e.g. luxury
          class) may have stricter requirements — they are shown on the car’s page.
        </li>
        <li>
          At handover you present an identity document (ID card or passport) and your driving licence. Companies also
          provide their details and a document proving the right to represent the company.
        </li>
        <li>
          Only drivers named in the agreement may drive the car. An additional driver must meet the same requirements.
        </li>
        <li>
          The Lessor may refuse to rent a car if a person does not meet the requirements, provides false information or
          is under the influence.
        </li>
      </ul>
    ),
  },
  {
    id: "price-and-payment",
    title: "Price and payment",
    body: (
      <>
        <p>
          The price is calculated from the tariffs shown on the car’s page (hourly, daily, weekly or long-term). When
          several tariffs fit the rental period, the most favourable one is applied.
        </p>
        <p>
          The price includes compulsory motor third-party liability insurance and maintenance. Fuel (charging for
          electric cars) is paid by the renter. The car is returned with the same amount of fuel as at handover; missing
          fuel is charged as set out in the agreement.
        </p>
        <p>
          If the car has a daily mileage limit, kilometres above it are charged at the rate stated in the agreement.
        </p>
        <p>
          You can pay by bank transfer or card; payment terms are set in the agreement. We issue VAT invoices to
          companies.
        </p>
      </>
    ),
  },
  {
    id: "deposit",
    title: "Deposit",
    body: (
      <>
        <p>A deposit is paid at handover. Its amount is shown on each car’s page.</p>
        <p>
          When you return the car, we inspect it together with you. If there is no new damage, fines or other debts, the
          deposit is returned the same day or within 3 business days by bank transfer.
        </p>
        <p>
          The deposit may be used to cover damage to the car (within the limits set in the agreement), missing fuel,
          extra cleaning, fines and other amounts payable under the agreement. If the deposit is not enough, the renter
          pays the difference.
        </p>
      </>
    ),
  },
  {
    id: "handover-and-return",
    title: "Handover and return",
    body: (
      <ul>
        <li>
          {ctx.officeOpen
            ? `The car is handed over and returned at ${ctx.office} during opening hours unless agreed otherwise.`
            : "The time and place of handover and return are agreed when the booking is confirmed."}
        </li>
        <li>
          At handover and return, the car’s condition, mileage and fuel level are recorded in a handover report; photos
          may be taken.
        </li>
        <li>
          The car is returned on time, clean and without personal belongings. Late return is charged according to the
          tariffs. If you are running late, let us know in advance.
        </li>
        <li>The rental can be extended by prior agreement if the car is available.</li>
        <li>The Lessor is not responsible for items left in the car.</li>
      </ul>
    ),
  },
  {
    id: "rules-of-use",
    title: "Rules of use",
    body: (
      <>
        <p>The renter and drivers use the car with care, follow the traffic rules and do not use the car:</p>
        <ul>
          <li>under the influence of alcohol, drugs, psychotropic or other psychoactive substances;</li>
          <li>for racing, training, driving lessons or off-road driving;</li>
          <li>to tow other vehicles or trailers without the Lessor’s consent;</li>
          <li>for commercial activities without the Lessor’s written consent;</li>
          <li>by letting persons not named in the agreement drive it, or by subletting it;</li>
          <li>outside Lithuania without the Lessor’s prior written consent.</li>
        </ul>
        <p>
          Smoking (including e-cigarettes) is not allowed in the car, and pets may only be carried with the Lessor’s
          consent. Breaking these rules may incur the extra cleaning fee set in the agreement.
        </p>
      </>
    ),
  },
  {
    id: "accidents-breakdowns-fines",
    title: "Accidents, breakdowns and fines",
    body: (
      <ul>
        <li>
          After a traffic accident, notify the Lessor immediately, call the police if needed (112), fill in the accident
          report form and take photos of the scene.
        </li>
        <li>
          If a warning light comes on or the car breaks down, do not continue driving if this could damage the car, and
          contact us. Repairing the car or replacing parts without the Lessor’s consent is not allowed.
        </li>
        <li>
          Fines, parking and road charges incurred during the rental are paid by the renter. If we learn about a fine
          later, we may provide the renter’s details to the issuing authority or ask the renter to pay it.
        </li>
      </ul>
    ),
  },
  {
    id: "liability",
    title: "Liability",
    body: (
      <>
        <p>
          The renter is liable for loss of or damage to the car during the rental, except where the damage is caused by
          a defect the renter is not responsible for. Liability limits and insurance excess are set in the rental
          agreement.
        </p>
        <p>
          Full liability applies if damage is caused intentionally, while under the influence, by breaking the rules of
          use or by a driver not named in the agreement.
        </p>
        <p>
          The Lessor is responsible for handing over a roadworthy car covered by compulsory insurance. If the car breaks
          down through no fault of the renter, we try to offer another car or refund the unused rental time.
        </p>
      </>
    ),
  },
  {
    id: "personal-data",
    title: "Personal data",
    body: (
      <p>
        We process personal data under our <Link href="/privatumo-politika">privacy policy</Link> and use cookies as
        described in our <Link href="/slapukai">cookie policy</Link>.
      </p>
    ),
  },
  {
    id: "disputes",
    title: "Disputes",
    body: (
      <>
        <p>
          These terms and the rental agreement are governed by the law of the Republic of Lithuania. We first try to
          resolve any dispute by negotiation — write to us at <Email value={ctx.email} />.
        </p>
        <p>
          Consumers may also contact the State Consumer Rights Protection Authority (
          <External href="https://www.vvtat.lt">www.vvtat.lt</External>) or the courts.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        The Lessor may change these terms. The new version is published on this page and applies to agreements concluded
        after its publication.
      </p>
    ),
  },
];

export default terms;
