import { prisma } from "@/lib/prisma";
import {
  assertActionAllowed,
  WorkflowError,
  type BookingStatusValue,
} from "@/lib/booking-state";

function statusOf(status: string) {
  return status as BookingStatusValue;
}

export async function assignArtisan({
  bookingId,
  artisanId,
  actorId,
}: {
  bookingId: string;
  artisanId: string;
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        cityId: true,
        serviceCategoryId: true,
      },
    });

    if (!booking) {
      throw new WorkflowError("BOOKING_NOT_FOUND", "Booking not found.", 404);
    }

    assertActionAllowed(statusOf(booking.status), "ASSIGN_ARTISAN");

    const artisan = await tx.artisanProfile.findFirst({
      where: {
        id: artisanId,
        status: "ACTIVE",
        cities: { some: { cityId: booking.cityId } },
        services: { some: { serviceId: booking.serviceCategoryId } },
      },
      include: { user: { select: { name: true } } },
    });

    if (!artisan) {
      throw new WorkflowError(
        "ARTISAN_NOT_ELIGIBLE",
        "That artisan is not active for this booking's city and service.",
        409,
      );
    }

    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        status: { in: ["REQUESTED", "ASSIGNED"] },
      },
      data: {
        artisanId,
        status: "ASSIGNED",
        quotedAmount: null,
        quoteNote: null,
        quotedAt: null,
        quoteApprovedAt: null,
        quoteRejectedAt: null,
      },
    });

    if (updated.count !== 1) {
      throw new WorkflowError(
        "BOOKING_CHANGED",
        "The booking changed before the assignment could be saved.",
        409,
      );
    }

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorId,
        type: "ARTISAN_ASSIGNED",
        note: `Assigned to ${artisan.user.name}.`,
      },
    });

    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
}

export async function submitQuote({
  bookingId,
  artisanUserId,
  actorId,
  amount,
  note,
}: {
  bookingId: string;
  artisanUserId: string;
  actorId: string;
  amount: number;
  note?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const artisan = await tx.artisanProfile.findUnique({
      where: { userId: artisanUserId },
      select: { id: true, status: true },
    });

    if (!artisan || artisan.status !== "ACTIVE") {
      throw new WorkflowError(
        "ARTISAN_NOT_ACTIVE",
        "Your artisan profile is not active.",
        403,
      );
    }

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, artisanId: true },
    });

    if (!booking) {
      throw new WorkflowError("BOOKING_NOT_FOUND", "Booking not found.", 404);
    }

    if (booking.artisanId !== artisan.id) {
      throw new WorkflowError(
        "NOT_ASSIGNED_ARTISAN",
        "This booking is assigned to another artisan.",
        403,
      );
    }

    assertActionAllowed(statusOf(booking.status), "SUBMIT_QUOTE");

    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        artisanId: artisan.id,
        status: "ASSIGNED",
      },
      data: {
        status: "QUOTED",
        quotedAmount: amount,
        quoteNote: note || null,
        quotedAt: new Date(),
        quoteApprovedAt: null,
        quoteRejectedAt: null,
      },
    });

    if (updated.count !== 1) {
      throw new WorkflowError(
        "BOOKING_CHANGED",
        "The booking changed before the quote could be saved.",
        409,
      );
    }

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorId,
        type: "QUOTE_SUBMITTED",
        note: `Quote submitted: NGN ${amount.toFixed(2)}.`,
      },
    });

    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
}

export async function respondToQuote({
  bookingId,
  clientId,
  actorId,
  decision,
}: {
  bookingId: string;
  clientId: string;
  actorId: string;
  decision: "APPROVE" | "REJECT";
}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        clientId: true,
        quotedAmount: true,
      },
    });

    if (!booking) {
      throw new WorkflowError("BOOKING_NOT_FOUND", "Booking not found.", 404);
    }

    if (booking.clientId !== clientId) {
      throw new WorkflowError(
        "NOT_BOOKING_CLIENT",
        "You cannot change another client's booking.",
        403,
      );
    }

    const action = decision === "APPROVE" ? "APPROVE_QUOTE" : "REJECT_QUOTE";
    assertActionAllowed(statusOf(booking.status), action);

    const now = new Date();
    const data =
      decision === "APPROVE"
        ? {
            status: "QUOTE_APPROVED" as const,
            quoteApprovedAt: now,
            quoteRejectedAt: null,
          }
        : {
            status: "ASSIGNED" as const,
            quoteApprovedAt: null,
            quoteRejectedAt: now,
          };

    const updated = await tx.booking.updateMany({
      where: { id: bookingId, clientId, status: "QUOTED" },
      data,
    });

    if (updated.count !== 1) {
      throw new WorkflowError(
        "BOOKING_CHANGED",
        "The booking changed before your response could be saved.",
        409,
      );
    }

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorId,
        type: decision === "APPROVE" ? "QUOTE_APPROVED" : "QUOTE_REJECTED",
        note:
          decision === "APPROVE"
            ? "Client approved the quote."
            : "Client rejected the quote and requested a revision.",
      },
    });

    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
}

export async function startWork({
  bookingId,
  artisanUserId,
  actorId,
}: {
  bookingId: string;
  artisanUserId: string;
  actorId: string;
}) {
  return artisanTransition({
    bookingId,
    artisanUserId,
    actorId,
    action: "START_WORK",
    from: "QUOTE_APPROVED",
    to: "IN_PROGRESS",
    eventType: "WORK_STARTED",
    eventNote: "Artisan started the repair.",
    extraData: { startedAt: new Date() },
  });
}

export async function markWorkComplete({
  bookingId,
  artisanUserId,
  actorId,
}: {
  bookingId: string;
  artisanUserId: string;
  actorId: string;
}) {
  return artisanTransition({
    bookingId,
    artisanUserId,
    actorId,
    action: "MARK_WORK_COMPLETE",
    from: "IN_PROGRESS",
    to: "AWAITING_HANDOVER",
    eventType: "WORK_FINISHED",
    eventNote: "Artisan marked the repair finished; client handover is pending.",
    extraData: { workFinishedAt: new Date() },
  });
}

async function artisanTransition({
  bookingId,
  artisanUserId,
  actorId,
  action,
  from,
  to,
  eventType,
  eventNote,
  extraData,
}: {
  bookingId: string;
  artisanUserId: string;
  actorId: string;
  action: "START_WORK" | "MARK_WORK_COMPLETE";
  from: "QUOTE_APPROVED" | "IN_PROGRESS";
  to: "IN_PROGRESS" | "AWAITING_HANDOVER";
  eventType: string;
  eventNote: string;
  extraData: { startedAt?: Date; workFinishedAt?: Date };
}) {
  return prisma.$transaction(async (tx) => {
    const artisan = await tx.artisanProfile.findUnique({
      where: { userId: artisanUserId },
      select: { id: true, status: true },
    });

    if (!artisan || artisan.status !== "ACTIVE") {
      throw new WorkflowError(
        "ARTISAN_NOT_ACTIVE",
        "Your artisan profile is not active.",
        403,
      );
    }

    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { status: true, artisanId: true },
    });

    if (!booking) {
      throw new WorkflowError("BOOKING_NOT_FOUND", "Booking not found.", 404);
    }

    if (booking.artisanId !== artisan.id) {
      throw new WorkflowError(
        "NOT_ASSIGNED_ARTISAN",
        "This booking is assigned to another artisan.",
        403,
      );
    }

    assertActionAllowed(statusOf(booking.status), action);

    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        artisanId: artisan.id,
        status: from,
      },
      data: {
        status: to,
        ...extraData,
      },
    });

    if (updated.count !== 1) {
      throw new WorkflowError(
        "BOOKING_CHANGED",
        "The booking changed before the action could be saved.",
        409,
      );
    }

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorId,
        type: eventType,
        note: eventNote,
      },
    });

    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
}

export async function confirmHandover({
  bookingId,
  clientId,
  actorId,
}: {
  bookingId: string;
  clientId: string;
  actorId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { status: true, clientId: true, artisanId: true },
    });

    if (!booking) {
      throw new WorkflowError("BOOKING_NOT_FOUND", "Booking not found.", 404);
    }

    if (booking.clientId !== clientId) {
      throw new WorkflowError(
        "NOT_BOOKING_CLIENT",
        "You cannot confirm another client's handover.",
        403,
      );
    }

    assertActionAllowed(statusOf(booking.status), "CONFIRM_HANDOVER");

    const now = new Date();
    const updated = await tx.booking.updateMany({
      where: {
        id: bookingId,
        clientId,
        status: "AWAITING_HANDOVER",
      },
      data: {
        status: "COMPLETED",
        handoverConfirmedAt: now,
        completedAt: now,
      },
    });

    if (updated.count !== 1) {
      throw new WorkflowError(
        "BOOKING_CHANGED",
        "The booking changed before handover could be confirmed.",
        409,
      );
    }

    if (booking.artisanId) {
      await tx.artisanProfile.update({
        where: { id: booking.artisanId },
        data: { jobsDone: { increment: 1 } },
      });
    }

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorId,
        type: "HANDOVER_CONFIRMED",
        note: "Client confirmed handover; repair completed.",
      },
    });

    return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
  });
}
