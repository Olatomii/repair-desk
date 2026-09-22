import type { Prisma } from "../../generated/prisma/client";

export async function notifyWorkflow(tx: Prisma.TransactionClient, bookingId: string, action: string, actorId: string) {
  const context = await tx.booking.findUnique({
    where: { id: bookingId },
    select: {
      reference: true,
      clientId: true,
      artisan: { select: { userId: true } },
    },
  });

  if (context) {
    const details: Record<string, { userId?: string; title: string; body: string; href: string }> = {
      ASSIGN_ARTISAN: {
        userId: context.artisan?.userId,
        title: "New repair assignment",
        body: `${context.reference} has been assigned to you.`,
        href: "/artisan",
      },
      SUBMIT_QUOTE: {
        userId: context.clientId,
        title: "Repair quote ready",
        body: `A quote is ready for ${context.reference}.`,
        href: "/client",
      },
      APPROVE_QUOTE: {
        userId: context.artisan?.userId,
        title: "Quote approved",
        body: `The client approved the quote for ${context.reference}.`,
        href: "/artisan",
      },
      REJECT_QUOTE: {
        userId: context.artisan?.userId,
        title: "Quote revision requested",
        body: `The client requested a revised quote for ${context.reference}.`,
        href: "/artisan",
      },
      START_WORK: {
        userId: context.clientId,
        title: "Repair started",
        body: `Work has started on ${context.reference}.`,
        href: "/client",
      },
      MARK_WORK_COMPLETE: {
        userId: context.clientId,
        title: "Repair ready for handover",
        body: `${context.reference} is ready for your handover confirmation.`,
        href: "/client",
      },
      CONFIRM_HANDOVER: {
        userId: context.artisan?.userId,
        title: "Handover confirmed",
        body: `${context.reference} has been confirmed complete by the client.`,
        href: "/artisan",
      },
    };
    const notification = details[action];
    if (notification?.userId && notification.userId !== actorId) {
      await tx.notification.create({
        data: {
          userId: notification.userId,
          title: notification.title,
          body: notification.body,
          href: notification.href,
        },
      });
    }
  }

}
