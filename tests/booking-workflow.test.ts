import { describe, expect, it } from "vitest";
import {
  assertActionAllowed,
  isActionAllowed,
  WorkflowError,
} from "../src/lib/booking-state";
import { bookingActionSchema } from "../src/lib/validators/workflow";

describe("booking workflow state rules", () => {
  it("allows the happy path from request to handover", () => {
    expect(isActionAllowed("REQUESTED", "ASSIGN_ARTISAN")).toBe(true);
    expect(isActionAllowed("ASSIGNED", "SUBMIT_QUOTE")).toBe(true);
    expect(isActionAllowed("QUOTED", "APPROVE_QUOTE")).toBe(true);
    expect(isActionAllowed("QUOTE_APPROVED", "START_WORK")).toBe(true);
    expect(isActionAllowed("IN_PROGRESS", "MARK_WORK_COMPLETE")).toBe(true);
    expect(isActionAllowed("AWAITING_HANDOVER", "CONFIRM_HANDOVER")).toBe(true);
  });

  it("supports quote rejection by returning to the assigned state", () => {
    expect(isActionAllowed("QUOTED", "REJECT_QUOTE")).toBe(true);
    expect(isActionAllowed("ASSIGNED", "SUBMIT_QUOTE")).toBe(true);
  });

  it("blocks work before a quote is approved", () => {
    expect(() => assertActionAllowed("QUOTED", "START_WORK")).toThrow(WorkflowError);
  });

  it("blocks client handover before the artisan finishes work", () => {
    expect(() => assertActionAllowed("IN_PROGRESS", "CONFIRM_HANDOVER")).toThrow(
      WorkflowError,
    );
  });
});

describe("booking workflow payloads", () => {
  it("accepts a valid quote", () => {
    expect(
      bookingActionSchema.safeParse({
        action: "SUBMIT_QUOTE",
        expectedUpdatedAt: "2026-09-20T00:00:00.000Z",
        amount: 18500,
        note: "Replacement part and labour",
      }).success,
    ).toBe(true);
  });

  it("rejects zero and negative quotes", () => {
    expect(
      bookingActionSchema.safeParse({
        action: "SUBMIT_QUOTE",
        expectedUpdatedAt: "2026-09-20T00:00:00.000Z",
        amount: 0,
      }).success,
    ).toBe(false);
  });
});
