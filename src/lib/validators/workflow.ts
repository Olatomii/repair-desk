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
]);

export type BookingActionInput = z.infer<typeof bookingActionSchema>;
