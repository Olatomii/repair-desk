import { z } from "zod";

export const createBookingSchema = z.object({
  serviceCategoryId: z.string().min(1, "Choose a service"),
  cityId: z.string().min(1, "Choose a city"),
  problemDescription: z
    .string()
    .trim()
    .min(12, "Describe the problem in a little more detail")
    .max(1200),
  address: z.string().trim().max(240).optional(),
  preferredDate: z
    .string()
    .optional()
    .refine((value) => !value || !Number.isNaN(Date.parse(value)), "Choose a valid date"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
