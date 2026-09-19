import { describe, expect, it } from "vitest";
import { createBookingSchema } from "../src/lib/validators/booking";
import { createBookingReference } from "../src/lib/booking-reference";

describe("booking validation", () => {
  it("accepts a useful booking request", () => {
    const result = createBookingSchema.safeParse({
      serviceCategoryId: "service-1",
      cityId: "city-1",
      problemDescription: "My kitchen sink is leaking continuously.",
      address: "Abeokuta, Ogun State",
      preferredDate: "2026-09-24",
    });

    expect(result.success).toBe(true);
  });

  it("rejects vague descriptions", () => {
    const result = createBookingSchema.safeParse({
      serviceCategoryId: "service-1",
      cityId: "city-1",
      problemDescription: "broken",
    });

    expect(result.success).toBe(false);
  });

  it("creates portfolio-friendly booking references", () => {
    expect(createBookingReference()).toMatch(/^RD-[A-Z0-9]+-[A-Z0-9]{5}$/);
  });
});
