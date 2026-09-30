import { z } from "zod";
const id = z.string().trim().min(1).max(128);
const name = z.string().trim().min(2).max(100);
const selections = z.array(id).max(100).refine(values => new Set(values).size === values.length, "Remove duplicate selections.");
const ids = selections.refine(values => values.length > 0, "Select at least one option.");
const snapshot = { id, expectedUpdatedAt: z.iso.datetime() };
const coverage = { cityIds: ids, serviceIds: ids };
const slug = z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const applicationSchema = z.object({
  phone: z.string().trim().min(7).max(30).regex(/^[+\d ()-]+$/),
  bio: z.string().trim().min(20).max(1000), ...coverage,
  expectedUpdatedAt: z.iso.datetime().optional(),
});
export const administrationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("REVIEW_ARTISAN"), ...snapshot, cityIds: selections, serviceIds: selections, status: z.enum(["ACTIVE", "SUSPENDED"]) }),
  z.object({ action: z.literal("SET_OPERATOR"), email: z.email().max(254).transform(v => v.toLowerCase()), operator: z.boolean() }),
  z.object({ action: z.literal("CREATE_CITY"), name, slug, state: name, country: name }),
  z.object({ action: z.literal("UPDATE_CITY"), ...snapshot, name, state: name, country: name, isActive: z.boolean() }),
  z.object({ action: z.literal("CREATE_SERVICE"), name, slug, description: z.string().trim().min(10).max(1000), mode: z.enum(["HOME", "WORKSHOP"]) }),
  z.object({ action: z.literal("UPDATE_SERVICE"), ...snapshot, name, description: z.string().trim().min(10).max(1000), isActive: z.boolean() }),
]);
export type AdministrationInput = z.infer<typeof administrationSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
