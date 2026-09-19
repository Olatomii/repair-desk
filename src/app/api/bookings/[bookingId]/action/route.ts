import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assignArtisan,
  confirmHandover,
  markWorkComplete,
  respondToQuote,
  startWork,
  submitQuote,
} from "@/lib/booking-workflow";
import { WorkflowError } from "@/lib/booking-state";
import { bookingActionSchema } from "@/lib/validators/workflow";

const allowedActionsByRole: Record<"CLIENT" | "ARTISAN" | "OPERATOR", readonly string[]> = {
  OPERATOR: ["ASSIGN_ARTISAN"],
  ARTISAN: ["SUBMIT_QUOTE", "START_WORK", "MARK_WORK_COMPLETE"],
  CLIENT: ["APPROVE_QUOTE", "REJECT_QUOTE", "CONFIRM_HANDOVER"],
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = bookingActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid workflow action.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const role =
    (session.user as typeof session.user & { role?: "CLIENT" | "ARTISAN" | "OPERATOR" }).role ??
    "CLIENT";
  if (!allowedActionsByRole[role].includes(parsed.data.action)) {
    return NextResponse.json({ error: "Your role cannot perform this action." }, { status: 403 });
  }

  const { bookingId } = await params;

  try {
    let booking;
    switch (parsed.data.action) {
      case "ASSIGN_ARTISAN":
        booking = await assignArtisan({ bookingId, artisanId: parsed.data.artisanId, actorId: session.user.id });
        break;
      case "SUBMIT_QUOTE":
        booking = await submitQuote({
          bookingId,
          artisanUserId: session.user.id,
          actorId: session.user.id,
          amount: parsed.data.amount,
          note: parsed.data.note,
        });
        break;
      case "APPROVE_QUOTE":
        booking = await respondToQuote({ bookingId, clientId: session.user.id, actorId: session.user.id, decision: "APPROVE" });
        break;
      case "REJECT_QUOTE":
        booking = await respondToQuote({ bookingId, clientId: session.user.id, actorId: session.user.id, decision: "REJECT" });
        break;
      case "START_WORK":
        booking = await startWork({ bookingId, artisanUserId: session.user.id, actorId: session.user.id });
        break;
      case "MARK_WORK_COMPLETE":
        booking = await markWorkComplete({ bookingId, artisanUserId: session.user.id, actorId: session.user.id });
        break;
      case "CONFIRM_HANDOVER":
        booking = await confirmHandover({ bookingId, clientId: session.user.id, actorId: session.user.id });
        break;
    }

    const context = await prisma.booking.findUnique({
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
      const notification = details[parsed.data.action];
      if (notification?.userId && notification.userId !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: notification.userId,
            title: notification.title,
            body: notification.body,
            href: notification.href,
          },
        });
      }
    }

    return NextResponse.json({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      quotedAmount: booking.quotedAmount?.toString() ?? null,
    });
  } catch (error) {
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Booking workflow action failed", error);
    return NextResponse.json({ error: "Unable to complete the booking action." }, { status: 500 });
  }
}
