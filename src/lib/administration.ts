import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../generated/prisma/client";
import { WorkflowError } from "@/lib/booking-state";
import type { AdministrationInput, ApplicationInput } from "@/lib/validators/administration";

async function validateCoverage(tx: Prisma.TransactionClient, input: { cityIds: string[]; serviceIds: string[] }, activeOnly: boolean) {
  if (activeOnly && (!input.cityIds.length || !input.serviceIds.length)) throw new WorkflowError("EMPTY_COVERAGE", "Select at least one active city and service.", 409);
  const cities = await tx.city.count({ where: { id: { in: input.cityIds }, ...(activeOnly ? { isActive: true } : {}) } });
  const services = await tx.serviceCategory.count({ where: { id: { in: input.serviceIds }, ...(activeOnly ? { isActive: true } : {}) } });
  if (cities !== input.cityIds.length || services !== input.serviceIds.length) {
    throw new WorkflowError("INVALID_COVERAGE", "Choose available cities and services.", 409);
  }
}
function changed(count: number) {
  if (count !== 1) throw new WorkflowError("CHANGED", "This record changed. Refresh before saving again.", 409);
}
const nextUpdate = (value: string) => new Date(Math.max(Date.now(), new Date(value).getTime() + 1));

export async function applyAsArtisan(userId: string, input: ApplicationInput) {
  return prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (user?.role !== "CLIENT") throw new WorkflowError("FORBIDDEN", "Only client accounts can apply.", 403);
    await validateCoverage(tx, input, true);
    const existing = await tx.artisanProfile.findUnique({ where: { userId } });
    if (existing && (existing.status !== "PENDING" || !input.expectedUpdatedAt)) {
      throw new WorkflowError("ALREADY_REVIEWED", "This application already exists or has been reviewed. Contact an operator for changes.", 409);
    }
    if (!existing && input.expectedUpdatedAt) throw new WorkflowError("CHANGED", "Application no longer exists. Refresh.", 409);
    let profile;
    if (existing) {
      changed((await tx.artisanProfile.updateMany({ where: { id: existing.id, status: "PENDING", updatedAt: new Date(input.expectedUpdatedAt!) },
        data: { phone: input.phone, bio: input.bio, updatedAt: nextUpdate(input.expectedUpdatedAt!) } })).count);
      await tx.artisanCity.deleteMany({ where: { artisanId: existing.id } });
      await tx.artisanService.deleteMany({ where: { artisanId: existing.id } });
      profile = existing;
    } else {
      profile = await tx.artisanProfile.create({ data: { userId, phone: input.phone, bio: input.bio } });
    }
    await tx.artisanCity.createMany({ data: input.cityIds.map(cityId => ({ artisanId: profile.id, cityId })) });
    await tx.artisanService.createMany({ data: input.serviceIds.map(serviceId => ({ artisanId: profile.id, serviceId })) });
    if (!existing) {
      const operators = await tx.user.findMany({ where: { role: "OPERATOR" }, select: { id: true } });
      await tx.notification.createMany({ data: operators.map(u => ({ userId: u.id, title: "Artisan application", body: `${user.name} applied to join Repair Desk.`, href: "/operator/manage" })) });
    }
    return { id: profile.id };
  }, { isolationLevel: "Serializable" });
}

export async function administer(actorId: string, input: AdministrationInput) {
  return prisma.$transaction(async tx => {
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    if (actor?.role !== "OPERATOR") throw new WorkflowError("FORBIDDEN", "Operator access required.", 403);
    switch (input.action) {
      case "REVIEW_ARTISAN": {
        await validateCoverage(tx, input, input.status === "ACTIVE");
        const profile = await tx.artisanProfile.findUnique({ where: { id: input.id }, include: { user: true } });
        if (!profile) throw new WorkflowError("NOT_FOUND", "Artisan not found.", 404);
        if (profile.user.role === "OPERATOR") throw new WorkflowError("ROLE_CONFLICT", "Operator accounts cannot be activated as artisans.", 409);
        changed((await tx.artisanProfile.updateMany({ where: { id: input.id, updatedAt: new Date(input.expectedUpdatedAt) }, data: { status: input.status, updatedAt: nextUpdate(input.expectedUpdatedAt) } })).count);
        if (input.status === "ACTIVE") await tx.user.update({ where: { id: profile.userId }, data: { role: "ARTISAN" } });
        await tx.artisanCity.deleteMany({ where: { artisanId: input.id } });
        await tx.artisanService.deleteMany({ where: { artisanId: input.id } });
        await tx.artisanCity.createMany({ data: input.cityIds.map(cityId => ({ artisanId: input.id, cityId })) });
        await tx.artisanService.createMany({ data: input.serviceIds.map(serviceId => ({ artisanId: input.id, serviceId })) });
        await tx.notification.create({ data: { userId: profile.userId, title: "Artisan profile updated", body: `Your artisan status is ${input.status.toLowerCase()}. Contact an operator if you need help.`, href: input.status === "ACTIVE" || profile.user.role === "ARTISAN" ? "/artisan" : "/apply" } });
        return { id: input.id };
      }
      case "SET_OPERATOR": {
        const target = await tx.user.findUnique({ where: { email: input.email }, include: { artisanProfile: true } });
        if (!target) throw new WorkflowError("NOT_FOUND", "Ask this person to register before provisioning their account.", 404);
        if (target.id === actorId) throw new WorkflowError("SELF_CHANGE", "You cannot change your own operator access.", 409);
        if (target.artisanProfile) throw new WorkflowError("ROLE_CONFLICT", "Artisan accounts cannot be changed through operator provisioning.", 409);
        if (!input.operator && target.role === "OPERATOR" && await tx.user.count({ where: { role: "OPERATOR" } }) <= 1) {
          throw new WorkflowError("LAST_OPERATOR", "Keep at least one operator.", 409);
        }
        await tx.user.update({ where: { id: target.id }, data: { role: input.operator ? "OPERATOR" : "CLIENT" } });
        await tx.session.deleteMany({ where: { userId: target.id } });
        return { id: target.id };
      }
      case "CREATE_CITY": {
        const { name, slug, state, country } = input;
        return tx.city.create({ data: { name, slug, state, country }, select: { id: true } });
      }
      case "UPDATE_CITY": {
        const { name, state, country, isActive } = input;
        changed((await tx.city.updateMany({ where: { id: input.id, updatedAt: new Date(input.expectedUpdatedAt) }, data: { name, state, country, isActive, updatedAt: nextUpdate(input.expectedUpdatedAt) } })).count);
        return { id: input.id };
      }
      case "CREATE_SERVICE": {
        const { name, slug, description, mode } = input;
        return tx.serviceCategory.create({ data: { name, slug, description, mode }, select: { id: true } });
      }
      case "UPDATE_SERVICE": {
        const { name, description, isActive } = input;
        changed((await tx.serviceCategory.updateMany({ where: { id: input.id, updatedAt: new Date(input.expectedUpdatedAt) }, data: { name, description, isActive, updatedAt: nextUpdate(input.expectedUpdatedAt) } })).count);
        return { id: input.id };
      }
    }
  }, { isolationLevel: "Serializable" });
}
