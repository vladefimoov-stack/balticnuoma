/* ЧЕРНОВИК: требует юридической проверки — draft rental terms (EN), aligned with the draft rental agreement. The LT version prevails. */
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
          ; the “Lessor”). Cars are rented to individuals and companies.
        </p>
        <p>
          {ctx.officeOpen
            ? `Cars are handed over and returned at ${ctx.office}.`
            : "Cars are handed over and returned at a place in Klaipėda agreed in advance."}{" "}
          Contacts: phone <Phone display={ctx.phone} e164={ctx.phoneE164} />, email <Email value={ctx.email} />.
        </p>
        <p>
          The rental is finally governed by the rental agreement, the handover report and the price list signed when you
          collect the car. Where the agreement differs from these terms, the agreement prevails. If the Lithuanian and
          English versions of these terms differ, the Lithuanian version prevails.
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
          driving licence for at least <strong>{ctx.rules.min_license_years} years</strong>. Some cars may have stricter
          requirements — they are shown on the car’s page.
        </li>
        <li>
          At handover you present an identity document (ID card or passport) and your driving licence. Companies also
          provide their details and a document proving the right to represent the company.
        </li>
        <li>
          Only drivers named in the agreement may drive the car. An additional driver must meet the same requirements;
          the renter is responsible for their actions as for their own.
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
          The price includes compulsory motor third-party liability insurance and scheduled maintenance. There is no
          mileage limit unless one is shown on the car’s page. Fuel is paid by the renter.
        </p>
        <ul>
          <li>If the rental is 2 months or shorter, the full price is paid at handover.</li>
          <li>
            If the rental is longer than 2 months, the first 2 months are paid at handover and the car is reserved for
            the whole period; after that, payments are made monthly in advance.
          </li>
          <li>Late payments incur default interest of 0.1% for each day of delay.</li>
        </ul>
        <p>You can pay by card or in cash; companies may pay by bank transfer against an invoice.</p>
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
          When you return the car, we inspect it together with you. If the agreement has not been breached and there are
          no debts, the deposit is returned within 1–3 days by the same method it was paid.
        </p>
        <p>The following are deducted from the deposit:</p>
        <ul>
          <li>the late-return fine: up to 1 day — €50, more than 1 day — €100;</li>
          <li>missing fuel — the filling-station price per litre plus a €30 service fee;</li>
          <li>
            a dirty car — €50 plus the cost of washing; dry cleaning (smoking, animals, soiled interior) — €100 plus the
            cost of cleaning;
          </li>
          <li>
            the cost of repairing damage to the interior, body, tyres, wheels, glass or other parts, including damage
            whose cause cannot be identified (e.g. the car was damaged while parked);
          </li>
          <li>a lost or damaged key — its cost, but no less than €200, plus €70 for the work;</li>
          <li>fines incurred during the rental plus a €30 handling fee per fine.</li>
        </ul>
        <p>
          The deposit is not returned if the car is taken outside Lithuania without a separate written agreement with
          the Lessor or is not returned for more than 3 days after the agreed time. If the deposit is not enough, the
          renter pays the difference within 5 business days of the Lessor’s demand.
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
            : "The time and place of handover and return are agreed when the booking is confirmed."}{" "}
          Delivery to another place is possible by agreement; the price depends on the distance.
        </li>
        <li>
          At handover and return, the car’s condition, mileage and fuel level are recorded in a handover report and
          photos are taken. If you notice damage not recorded in the report, tell us before you start driving.
        </li>
        <li>
          The car is returned on time, with the same amount of fuel, clean, with all its equipment, keys and the
          registration certificate.
        </li>
        <li>
          If you return the car late, the actual extra time is charged according to the tariffs in addition to the fine;
          let us know about any delay in advance. If the car is not returned for more than 3 days, we contact the law
          enforcement authorities.
        </li>
        <li>
          The rental can be extended only by prior agreement and only if the car is not booked for that period;
          otherwise the car is returned at the agreed time.
        </li>
        <li>If the car is returned early, the unused time is not refunded unless agreed otherwise.</li>
        <li>The Lessor is not responsible for items left in the car.</li>
      </ul>
    ),
  },
  {
    id: "rules-of-use",
    title: "Rules of use",
    body: (
      <>
        <p>
          The renter and drivers use the car with care, follow the traffic rules, keep the car locked and do not leave
          the keys or documents in it. It is prohibited to:
        </p>
        <ul>
          <li>drive under the influence of alcohol, drugs, psychotropic or other psychoactive substances;</li>
          <li>smoke in the car (including e-cigarettes) or carry animals without the Lessor’s consent;</li>
          <li>
            take part in races or training, give driving lessons, drive off-road or tow other vehicles or trailers;
          </li>
          <li>sublet the car or let persons not named in the agreement drive it;</li>
          <li>use the car for courier services or other commercial activities without the Lessor’s written consent;</li>
          <li>take the car outside Lithuania without a separate written agreement with the Lessor.</li>
        </ul>
        <p>
          If a warning light comes on or a fault appears, tell us immediately and stop driving if continuing could
          damage the car. Repairing the car without the Lessor’s consent is prohibited. For long-term rentals, the
          renter brings the car for maintenance at the time we set; we pay for scheduled maintenance.
        </p>
        <p>
          The cars are fitted with GPS trackers and may be fitted with dashcams — they must not be switched off or
          removed. How we process this data is described in our <Link href="/privatumo-politika">privacy policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: "insurance-and-liability",
    title: "Insurance and liability",
    body: (
      <>
        <p>
          The cars are covered only by compulsory motor third-party liability insurance, which compensates damage caused
          to third parties. Damage to the car itself is not insured (no comprehensive cover).
        </p>
        <p>
          The renter is therefore liable for loss of or damage to the car during the rental and compensates the Lessor’s
          losses, except where the damage is caused by a defect the renter is not responsible for. Lost documents or
          number plates are charged at their replacement cost plus €70.
        </p>
        <p>The Lessor is responsible for handing over a roadworthy car covered by compulsory insurance.</p>
      </>
    ),
  },
  {
    id: "accidents-breakdowns-fines",
    title: "Accidents, breakdowns and fines",
    body: (
      <ul>
        <li>
          After any traffic accident, call the police immediately (112), notify the Lessor as soon as possible, take
          photos of the scene and, where applicable, fill in the accident report form.
        </li>
        <li>
          If the car breaks down through no fault of the renter, we provide all possible assistance: we replace it if
          another car is available or, if not, refund the unused time and tow the car at our expense. If the breakdown
          or accident is the renter’s fault, the renter pays for towing and repairs.
        </li>
        <li>
          Fines and charges incurred during the rental are paid by the renter. We may provide the renter’s details to
          the authority that issued the fine; a €30 handling fee applies per fine.
        </li>
      </ul>
    ),
  },
  {
    id: "cancellation-and-termination",
    title: "Cancellation and termination",
    body: (
      <>
        <p>
          You can cancel a request or a confirmed booking before the car is handed over — any prepayment is refunded.
          Please let us know as early as possible.
        </p>
        <p>
          The Lessor may terminate the agreement immediately and take back the car if the renter fails to pay on time,
          breaks the rules of use, lets persons not named in the agreement drive or otherwise materially breaches it. In
          that case the deposit is returned only to the extent it is not needed to cover the losses.
        </p>
      </>
    ),
  },
  {
    id: "personal-data",
    title: "Personal data",
    body: (
      <p>
        We process personal data, including GPS and dashcam data, under our{" "}
        <Link href="/privatumo-politika">privacy policy</Link> and use cookies as described in our{" "}
        <Link href="/slapukai">cookie policy</Link>.
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
          resolve any dispute by negotiation — write to us at <Email value={ctx.email} />. Failing that, disputes are
          settled by the courts of the Republic of Lithuania in Klaipėda, unless the law provides consumers with a
          different jurisdiction.
        </p>
        <p>
          Consumers may also contact the State Consumer Rights Protection Authority (
          <External href="https://www.vvtat.lt">www.vvtat.lt</External>).
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
