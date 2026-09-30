import { prisma } from "@/lib/prisma";
import { assertActionAllowed, WorkflowError, type BookingStatusValue } from "@/lib/booking-state";
import type { BookingActionInput } from "@/lib/validators/workflow";

type ExceptionInput = Extract<BookingActionInput, { action: "CANCEL_BOOKING" | "OPEN_DISPUTE" | "RESOLVE_DISPUTE" }>;
const resumable: BookingStatusValue[] = ["QUOTE_APPROVED", "IN_PROGRESS", "AWAITING_HANDOVER", "COMPLETED"];

export async function handleException(bookingId: string, actorId: string, input: ExceptionInput) {
  return prisma.$transaction(async tx => {
    const actor = await tx.user.findUnique({ where: { id: actorId } });
    const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { artisan: true } });
    if (!booking) throw new WorkflowError("NOT_FOUND", "Repair not found.", 404);
    const operator = actor?.role === "OPERATOR";
    const owner = booking.clientId === actorId;
    const assigned = actor?.role === "ARTISAN" && booking.artisan?.userId === actorId && booking.artisan.status === "ACTIVE";
    const allowed = input.action === "RESOLVE_DISPUTE" ? operator
      : input.action === "CANCEL_BOOKING" ? owner || operator : owner || assigned;
    if (!allowed) throw new WorkflowError("FORBIDDEN", "You cannot perform this action on this repair.", 403);
    assertActionAllowed(booking.status, input.action);
    let status: BookingStatusValue = input.action === "OPEN_DISPUTE" ? "DISPUTED" : "CANCELLED";
    let type = input.action === "OPEN_DISPUTE" ? `DISPUTE_OPENED_${booking.status}` : "BOOKING_CANCELLED";
    if (input.action === "RESOLVE_DISPUTE") {
      // The original state is immutable event history, never a client-supplied status.
      const opened = await tx.bookingEvent.findFirst({
        where: { bookingId, type: { startsWith: "DISPUTE_OPENED_" } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      });
      const previous = opened?.type.replace("DISPUTE_OPENED_", "") as BookingStatusValue;
      if (!resumable.includes(previous)) throw new WorkflowError("INVALID_DISPUTE", "This dispute needs a history review before resolution.", 409);
      if (input.resolution === "CANCEL" && previous === "COMPLETED") {
        throw new WorkflowError("ALREADY_COMPLETED", "A completed repair cannot be cancelled. Resolve the dispute by restoring its completed status.", 409);
      }
      status = input.resolution === "RESUME" ? previous : "CANCELLED";
      type = `DISPUTE_RESOLVED_${input.resolution}`;
    }
    const updated = await tx.booking.updateMany({
      where: { id: bookingId, status: booking.status, updatedAt: new Date(input.expectedUpdatedAt) },
      data: { status, updatedAt: new Date(Math.max(Date.now(), new Date(input.expectedUpdatedAt).getTime() + 1)) },
    });
    if (updated.count !== 1) throw new WorkflowError("BOOKING_CHANGED", "The repair changed. Refresh before trying again.", 409);
    await tx.bookingEvent.create({ data: { bookingId, actorId, type, note: input.reason } });
    const operators = input.action === "OPEN_DISPUTE" ? await tx.user.findMany({ where: { role: "OPERATOR" }, select: { id: true } }) : [];
    const recipients = new Set([booking.clientId, booking.artisan?.userId, ...operators.map(u => u.id)]);
    recipients.delete(actorId);
    recipients.delete(undefined);
    await tx.notification.createMany({ data: [...recipients].map(userId => ({
      userId: userId!, title: input.action === "OPEN_DISPUTE" ? "Repair dispute opened" : input.action === "RESOLVE_DISPUTE" ? "Repair dispute resolved" : "Repair cancelled",
      body: `${booking.reference}: ${input.reason}`,
      href: operators.some(u => u.id === userId) ? "/operator" : userId === booking.clientId ? "/client" : "/artisan",
    })) });
    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  }, { isolationLevel: "Serializable" });
}
