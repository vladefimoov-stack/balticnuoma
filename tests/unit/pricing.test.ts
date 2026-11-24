import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_PRICING, DEFAULT_RENTAL_RULES } from "@/lib/data/defaults";
import { resolvePricing, resolveRentalRules } from "@/lib/db/json";
import { availableModes, quoteDays, quoteHours, type QuoteResult } from "@/lib/pricing/calculate";

const economy = { pricing: DEFAULT_PRICING, rules: DEFAULT_RENTAL_RULES };

// Seeded "prabangi" category: no hourly, no long-term, min 1 day, daily/weekly only.
const luxury = {
  pricing: resolvePricing(DEFAULT_PRICING, {
    hourly: { enabled: false },
    daily: { enabled: true, price: 189 },
    weekly: { enabled: true, price: 1150 },
    long_term: { enabled: false },
    deposit: 3000,
  }),
  rules: resolveRentalRules(DEFAULT_RENTAL_RULES, {
    min_age: 25,
    min_license_years: 5,
    min_rental_days: 1,
    allowed_rental_types: ["daily", "weekly"],
  }),
};

function total(result: QuoteResult) {
  assert.ok(result.ok, `expected a quote, got ${JSON.stringify(result)}`);
  return { total: result.quote.total, type: result.quote.rentalType, lines: result.quote.lines };
}

describe("quoteDays — economy defaults (18 €/day, 115 €/week, 105 €/week from 4 weeks)", () => {
  it("1 day = 18 €", () => assert.deepEqual(total(quoteDays(economy.pricing, economy.rules, 1)).total, 18));
  it("6 days stay daily (108 € < 115 € week)", () => {
    const q = total(quoteDays(economy.pricing, economy.rules, 6));
    assert.equal(q.total, 108);
    assert.equal(q.type, "daily");
  });
  it("7 days = one week (115 €)", () => {
    const q = total(quoteDays(economy.pricing, economy.rules, 7));
    assert.equal(q.total, 115);
    assert.equal(q.type, "weekly");
  });
  it("9 days = 1 week + 2 days = 151 € (brief example)", () => {
    const q = total(quoteDays(economy.pricing, economy.rules, 9));
    assert.equal(q.total, 151);
    assert.deepEqual(
      q.lines.map((l) => [l.kind, l.quantity, l.total]),
      [
        ["weeks", 1, 115],
        ["days", 2, 36],
      ],
    );
  });
  it("27 days: weekly + 6 days (453 €), long-term not yet eligible", () => {
    const q = total(quoteDays(economy.pricing, economy.rules, 27));
    assert.equal(q.total, 453);
    assert.equal(q.type, "weekly");
  });
  it("28 days = 4 long-term weeks (420 €)", () => {
    const q = total(quoteDays(economy.pricing, economy.rules, 28));
    assert.equal(q.total, 420);
    assert.equal(q.type, "long_term");
  });
  it("30 days = 4 long-term weeks + 2 days pro rata (450 €)", () => {
    assert.equal(total(quoteDays(economy.pricing, economy.rules, 30)).total, 450);
  });
  it("rejects 0 days and more than a year", () => {
    assert.deepEqual(quoteDays(economy.pricing, economy.rules, 0), { ok: false, reason: "min_days", min: 1 });
    assert.equal(quoteDays(economy.pricing, economy.rules, 400).ok, false);
  });
  it("respects min_rental_days", () => {
    const rules = { ...economy.rules, min_rental_days: 3 };
    assert.deepEqual(quoteDays(economy.pricing, rules, 2), { ok: false, reason: "min_days", min: 3 });
    assert.equal(total(quoteDays(economy.pricing, rules, 3)).total, 54);
  });
  it("weekly-only car rounds leftover days up to a week", () => {
    const pricing = resolvePricing(DEFAULT_PRICING, { daily: { enabled: false } });
    const q = total(quoteDays(pricing, economy.rules, 9));
    assert.equal(q.total, 230);
    assert.equal(q.lines[1].kind, "extraWeek");
  });
});

describe("quoteHours", () => {
  it("enforces the minimum hours", () => {
    assert.deepEqual(quoteHours(economy.pricing, economy.rules, 2), { ok: false, reason: "min_hours", min: 3 });
  });
  it("3 h = 18 €, 5 h = 30 €", () => {
    assert.equal(total(quoteHours(economy.pricing, economy.rules, 3)).total, 18);
    assert.equal(total(quoteHours(economy.pricing, economy.rules, 5)).total, 30);
  });
});

describe("luxury class (no hourly, no long-term)", () => {
  it("offers only day rentals", () =>
    assert.deepEqual(availableModes(luxury.pricing, luxury.rules), { hourly: false, days: true }));
  it("hourly is not available", () => assert.equal(quoteHours(luxury.pricing, luxury.rules, 4).ok, false));
  it("10 days = 1150 € + 3 × 189 € = 1717 €", () =>
    assert.equal(total(quoteDays(luxury.pricing, luxury.rules, 10)).total, 1717));
  it("35 days never uses the disabled long-term tariff", () => {
    assert.equal(total(quoteDays(luxury.pricing, luxury.rules, 35)).type, "weekly");
  });
});
