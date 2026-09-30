import { z } from "zod";

export const bookingActionSchema = z.discriminatedUnion("action", [
  z.object({
    expectedUpdatedAt: z.iso.datetime(),
    action: z.literal("ASSIGN_ARTISAN"),
    artisanId: z.string().trim().min(1).max(128),
  }),
  z.object({
    expectedUpdatedAt: z.iso.datetime(),
    action: z.literal("SUBMIT_QUOTE"),
    amount: z.number().min(0.01).max(10_000_000).multipleOf(0.01),
    note: z.string().trim().max(600).optional(),
  }),
  z.object({
    expectedUpdatedAt: z.iso.datetime(),
    action: z.literal("APPROVE_QUOTE"),
  }),
  z.object({
    expectedUpdatedAt: z.iso.datetime(),
    action: z.literal("REJECT_QUOTE"),
  }),
  z.object({
    expectedUpdatedAt: z.iso.datetime(),
    action: z.literal("START_WORK"),
  }),
  z.object({
    expectedUpdatedAt: z.iso.datetime(),
    action: z.literal("MARK_WORK_COMPLETE"),
  }),
  z.object({
    expectedUpdatedAt: z.iso.datetime(),
    action: z.literal("CONFIRM_HANDOVER"),
  }),
  z.object({ action: z.literal("CANCEL_BOOKING"), expectedUpdatedAt: z.iso.datetime(), reason: z.string().trim().min(10).max(1000) }),
  z.object({ action: z.literal("OPEN_DISPUTE"), expectedUpdatedAt: z.iso.datetime(), reason: z.string().trim().min(10).max(1000) }),
  z.object({ action: z.literal("RESOLVE_DISPUTE"), expectedUpdatedAt: z.iso.datetime(), reason: z.string().trim().min(10).max(1000), resolution: z.enum(["RESUME", "CANCEL"]) }),
]);

export type BookingActionInput = z.infer<typeof bookingActionSchema>;
