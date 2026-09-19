import { z } from "zod";

export const bookingActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("ASSIGN_ARTISAN"),
    artisanId: z.string().min(1),
  }),
  z.object({
    action: z.literal("SUBMIT_QUOTE"),
    amount: z.number().positive().max(10_000_000),
    note: z.string().trim().max(600).optional(),
  }),
  z.object({
    action: z.literal("APPROVE_QUOTE"),
  }),
  z.object({
    action: z.literal("REJECT_QUOTE"),
  }),
  z.object({
    action: z.literal("START_WORK"),
  }),
  z.object({
    action: z.literal("MARK_WORK_COMPLETE"),
  }),
  z.object({
    action: z.literal("CONFIRM_HANDOVER"),
  }),
]);

export type BookingActionInput = z.infer<typeof bookingActionSchema>;
