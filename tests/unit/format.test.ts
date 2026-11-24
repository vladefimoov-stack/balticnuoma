import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingNumber, formatSelection } from "@/lib/booking/format";
import { normalizePhone } from "@/lib/booking/schema";

const days = (startDate: string, endDate: string) => ({ mode: "days" as const, startDate, endDate });

describe("formatSelection", () => {
  it("writes Lithuanian ranges with m. / d.", () => {
    assert.equal(formatSelection(days("2026-12-12", "2026-12-20"), "lt"), "2026 m. gruodžio 12–20 d.");
    assert.equal(formatSelection(days("2026-11-28", "2026-12-03"), "lt"), "2026 m. lapkričio 28 d. – gruodžio 3 d.");
    assert.equal(formatSelection(days("2026-12-05", "2026-12-05"), "lt"), "2026 m. gruodžio 5 d.");
  });
  it("crosses years", () => {
    assert.equal(
      formatSelection(days("2026-12-28", "2027-01-03"), "lt"),
      "2026 m. gruodžio 28 d. – 2027 m. sausio 3 d.",
    );
  });
  it("formats hourly slots in English", () => {
    assert.equal(
      formatSelection({ mode: "hourly", date: "2026-12-03", startHour: 14, hours: 3 }, "en"),
      "3 December 2026, 14:00–17:00",
    );
  });
});

describe("helpers", () => {
  it("pads booking numbers", () => assert.equal(bookingNumber(11), "BN-000011"));
  it("normalizes Lithuanian phone numbers", () => {
    assert.equal(normalizePhone("8 612 34567"), "+37061234567");
    assert.equal(normalizePhone("+370 (612) 34-567"), "+37061234567");
    assert.equal(normalizePhone("0049 151 1234567"), "+491511234567");
  });
});
