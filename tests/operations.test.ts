import { describe, expect, it } from "vitest";
import { isActionAllowed } from "../src/lib/booking-state";
import { bookingActionSchema } from "../src/lib/validators/workflow";
import { administrationSchema, applicationSchema } from "../src/lib/validators/administration";
describe("exception boundaries", () => {
  it("only allows direct cancellation before work", () => {
    for (const status of ["REQUESTED", "ASSIGNED", "QUOTED", "QUOTE_APPROVED"] as const) expect(isActionAllowed(status, "CANCEL_BOOKING")).toBe(true);
    for (const status of ["IN_PROGRESS", "AWAITING_HANDOVER", "COMPLETED", "CANCELLED", "DISPUTED"] as const) expect(isActionAllowed(status, "CANCEL_BOOKING")).toBe(false);
  });
  it("pauses normal work while disputed", () => {
    for (const action of ["ASSIGN_ARTISAN", "SUBMIT_QUOTE", "START_WORK", "MARK_WORK_COMPLETE", "CONFIRM_HANDOVER", "OPEN_DISPUTE"] as const) expect(isActionAllowed("DISPUTED", action)).toBe(false);
    expect(isActionAllowed("DISPUTED", "RESOLVE_DISPUTE")).toBe(true);
  });
  it("requires a meaningful reason and rejects arbitrary resolution states", () => {
    const input = { action: "RESOLVE_DISPUTE", expectedUpdatedAt: "2026-09-30T00:00:00.000Z", reason: "Agreed resolution with both parties" };
    expect(bookingActionSchema.safeParse({ ...input, resolution: "COMPLETED" }).success).toBe(false);
    expect(bookingActionSchema.safeParse({ ...input, resolution: "RESUME" }).success).toBe(true);
    expect(bookingActionSchema.safeParse({ ...input, resolution: "CANCEL", reason: " " }).success).toBe(false);
  });
});
describe("administration validation", () => {
  it("requires nonduplicate coverage and valid contact information", () => {
    const input = { phone: "+234 800 123 4567", bio: "I have five years of plumbing experience.", cityIds: ["city"], serviceIds: ["service"] };
    expect(applicationSchema.safeParse(input).success).toBe(true);
    expect(applicationSchema.safeParse({ ...input, cityIds: [] }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...input, cityIds: ["city", "city"] }).success).toBe(false);
    expect(applicationSchema.safeParse({ ...input, phone: "not a phone" }).success).toBe(false);
  });
  it("requires snapshots and boolean access decisions", () => {
    expect(administrationSchema.safeParse({ action: "REVIEW_ARTISAN", id: "p", status: "ACTIVE", cityIds: ["c"], serviceIds: ["s"] }).success).toBe(false);
    expect(administrationSchema.safeParse({ action: "SET_OPERATOR", email: "person@example.com", operator: "true" }).success).toBe(false);
  });
});
