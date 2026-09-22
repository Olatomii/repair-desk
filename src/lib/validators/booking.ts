import { z } from "zod";

export const createBookingSchema = z.object({
  serviceCategoryId: z.string().trim().min(1, "Choose a service").max(128),
  cityId: z.string().trim().min(1, "Choose a city").max(128),
  problemDescription: z
    .string()
    .trim()
    .min(12, "Describe the problem in a little more detail")
    .max(1200),
  address: z.string().trim().max(240).optional(),
  preferredDate: z
    .string()
    .max(10)
    .optional()
    .refine((value) => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value), "Choose a valid date"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
