/* ЧЕРНОВИК: требует юридической проверки — draft privacy policy (EN, GDPR). The LT version prevails. */
import { Link } from "@/i18n/navigation";
import type { LegalDocument } from "./types";
import { Email, External, Phone, Req } from "./ui";

const privacy: LegalDocument = (ctx) => [
  {
    id: "controller",
    title: "Data controller",
    body: (
      <>
        <p>
          The controller of your personal data is <strong>{ctx.company.name}</strong>, company code{" "}
          <Req value={ctx.company.code} />, registered address <Req value={ctx.company.address} /> (“we”).
        </p>
        <p>
          For data protection questions, write to <Email value={ctx.privacyEmail} />, call{" "}
          <Phone display={ctx.phone} e164={ctx.phoneE164} /> or visit us at {ctx.office}.
        </p>
        <p>
          We process personal data under the General Data Protection Regulation (GDPR, (EU) 2016/679) and the Law on
          Legal Protection of Personal Data of the Republic of Lithuania.
        </p>
      </>
    ),
  },
  {
    id: "data-we-process",
    title: "What data we process",
    body: (
      <ul>
        <li>
          <strong>Booking request on the website:</strong> first and last name, phone number, email address, year your
          driving licence was issued, the chosen car, rental period and price, your comment, the time you accepted the
          rental terms and the website language.
        </li>
        <li>
          <strong>Requests by phone or message:</strong> the details you give us during the conversation (our staff
          enter them into the booking system).
        </li>
        <li>
          <strong>Rental agreement:</strong> identity document and driving licence details, date of birth, address,
          payment and deposit information, handover and return data (mileage, condition, photos), data on accidents,
          damage and fines.
        </li>
        <li>
          <strong>Communication:</strong> emails, WhatsApp and Telegram messages and call information.
        </li>
        <li>
          <strong>Technical data:</strong> to protect the booking form from abuse we store only an irreversible hash of
          your IP address. Our hosting provider’s server logs briefly keep the IP address, browser type and time of
          requests.
        </li>
        <li>
          <strong>Cookies:</strong> see our <Link href="/slapukai">cookie policy</Link>.
        </li>
      </ul>
    ),
  },
  {
    id: "purposes-and-legal-bases",
    title: "Purposes and legal bases",
    body: (
      <ul>
        <li>
          <strong>Handling requests, booking, concluding and performing the rental agreement</strong>, including emails
          about the status of your request — contract or steps before entering into it (GDPR Art. 6(1)(b)).
        </li>
        <li>
          <strong>Accounting, taxes and replies to authorities</strong> (e.g. about fines) — legal obligation (GDPR Art.
          6(1)(c)).
        </li>
        <li>
          <strong>Website security, abuse prevention, protection of property, establishing and defending claims</strong>{" "}
          — legitimate interest (GDPR Art. 6(1)(f)).
        </li>
        <li>
          <strong>The map{ctx.analytics && " and visitor statistics"}</strong> — your consent (GDPR Art. 6(1)(a)), which
          you can withdraw at any time.
        </li>
      </ul>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <ul>
        <li>Requests that did not lead to a rental agreement — 12 months from the request.</li>
        <li>
          Rental agreements, accounting documents and related data — 10 years after the agreement ends (accounting
          record-keeping and limitation periods).
        </li>
        <li>Correspondence — up to 2 years after the last contact.</li>
        <li>Request counters used for abuse prevention — no longer than 24 hours.</li>
        <li>Server logs — for the period set by the provider, usually up to 30 days.</li>
      </ul>
    ),
  },
  {
    id: "recipients",
    title: "Who we share data with",
    body: (
      <>
        <p>Data is processed by service providers acting on our behalf (processors):</p>
        <ul>
          <li>website hosting — Vercel Inc.;</li>
          <li>database and file storage — Supabase Inc.;</li>
          <li>email delivery — Resend;</li>
          <li>Google (the Google Maps map{ctx.analytics && " and Google Analytics"}) — only with your consent;</li>
          <li>accounting and IT service providers.</li>
        </ul>
        <p>
          Where required by law or the agreement, we share data with insurers, the police, courts, other public
          authorities and debt collection companies.
        </p>
        <p>
          Some providers are located outside the European Economic Area (e.g. in the USA). In that case data is
          transferred under the EU–US Data Privacy Framework and/or the European Commission’s standard contractual
          clauses.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    body: (
      <>
        <p>You have the right to:</p>
        <ul>
          <li>access your data and get a copy of it;</li>
          <li>have inaccurate data corrected;</li>
          <li>have your data erased when it is no longer needed or there is no basis to process it;</li>
          <li>restrict processing;</li>
          <li>receive the data you provided in a structured format (portability);</li>
          <li>object to processing based on legitimate interest;</li>
          <li>
            withdraw your consent at any time — for example in “Cookie settings” in the website footer (this does not
            affect processing before the withdrawal).
          </li>
        </ul>
        <p>
          Send requests to <Email value={ctx.privacyEmail} />. We reply within one month and may ask you to confirm your
          identity first.
        </p>
        <p>
          If you believe your data is processed unlawfully, you may lodge a complaint with the State Data Protection
          Inspectorate of Lithuania (<External href="https://vdai.lrv.lt">vdai.lrv.lt</External>).
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Data security",
    body: (
      <p>
        Data is sent over an encrypted connection (HTTPS), access to the booking system is limited to authorised staff
        and protected by passwords, and the database enforces access rules. Backups are made regularly.
      </p>
    ),
  },
  {
    id: "automated-decisions",
    title: "Automated decisions",
    body: <p>We do not make decisions based solely on automated processing and do not carry out profiling.</p>,
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        We may update this policy. The new version is published on this page, and significant changes are also
        highlighted on the website.
      </p>
    ),
  },
];

export default privacy;
