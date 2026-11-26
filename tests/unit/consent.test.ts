import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSENT_VERSION, parseConsent, serializeConsent } from "@/lib/consent";
import { companySchema } from "@/lib/db/json";

describe("cookie consent cookie", () => {
  it("round-trips a choice", () => {
    const at = Date.UTC(2026, 10, 25);
    const parsed = parseConsent(serializeConsent({ maps: true, analytics: false, at }));
    assert.deepEqual(parsed, { maps: true, analytics: false, at });
  });

  it("treats a missing, broken or outdated cookie as 'no choice yet'", () => {
    assert.equal(parseConsent(undefined), null);
    assert.equal(parseConsent(""), null);
    assert.equal(parseConsent("%7Bnot-json"), null);
    const old = encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION - 1, m: 1, a: 1, t: 1 }));
    assert.equal(parseConsent(old), null);
  });

  it("asks again once GA is switched on if the choice was made without the analytics option", () => {
    const before = serializeConsent({ maps: true, analytics: false, at: 1 }, false);
    assert.deepEqual(parseConsent(before, false), { maps: true, analytics: false, at: 1 });
    assert.equal(parseConsent(before, true), null); // GA added later → banner again
    const legacy = encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION, m: 1, a: 0, t: 1 })); // no "o"
    assert.equal(parseConsent(legacy, true), null);
    const withGa = serializeConsent({ maps: false, analytics: true, at: 2 }, true);
    assert.deepEqual(parseConsent(withGa, true), { maps: false, analytics: true, at: 2 });
  });

  it("never reports analytics consent when GA is not configured", () => {
    // NEXT_PUBLIC_GA_MEASUREMENT_ID is not set in tests → analytics is disabled site-wide.
    const raw = encodeURIComponent(JSON.stringify({ v: CONSENT_VERSION, m: 0, a: 1, t: 1 }));
    assert.deepEqual(parseConsent(raw), { maps: false, analytics: false, at: 1 });
  });
});

describe("company requisites setting", () => {
  it("accepts the empty seed value and a filled one", () => {
    const empty = { legal_name: "", company_code: "", vat_code: "", registered_address: "", privacy_email: "" };
    assert.ok(companySchema.safeParse(empty).success);
    assert.ok(
      companySchema.safeParse({
        legal_name: "UAB „Baltic Nuoma“",
        company_code: "305000000",
        vat_code: "LT100000000000",
        registered_address: "Birutės g. 21, Klaipėda",
        privacy_email: "info@balticnuoma.lt",
      }).success,
    );
  });

  it("rejects a malformed privacy email and over-long codes", () => {
    const base = { legal_name: "", company_code: "", vat_code: "", registered_address: "", privacy_email: "" };
    assert.equal(companySchema.safeParse({ ...base, privacy_email: "not-an-email" }).success, false);
    assert.equal(companySchema.safeParse({ ...base, company_code: "1".repeat(21) }).success, false);
  });
});
