import { rejectCrossOrigin, readJson } from "@/lib/request-validation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assignArtisan,
  confirmHandover,
  markWorkComplete,
  respondToQuote,
  startWork,
  submitQuote,
} from "@/lib/booking-workflow";
import { prisma } from "@/lib/prisma";
import { handleException } from "@/lib/booking-exceptions";
import { Prisma } from "../../../../../../generated/prisma/client";
import { WorkflowError } from "@/lib/booking-state";
import { bookingActionSchema } from "@/lib/validators/workflow";

const allowedActionsByRole: Record<"CLIENT" | "ARTISAN" | "OPERATOR", readonly string[]> = {
  OPERATOR: ["ASSIGN_ARTISAN", "CANCEL_BOOKING", "RESOLVE_DISPUTE"],
  ARTISAN: ["SUBMIT_QUOTE", "START_WORK", "MARK_WORK_COMPLETE", "OPEN_DISPUTE", "CANCEL_BOOKING", "APPROVE_QUOTE", "REJECT_QUOTE", "CONFIRM_HANDOVER"],
  CLIENT: ["APPROVE_QUOTE", "REJECT_QUOTE", "CONFIRM_HANDOVER", "CANCEL_BOOKING", "OPEN_DISPUTE"],
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body: unknown = await readJson(request);
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
  if (!allowedActionsByRole[role]?.includes(parsed.data.action)) {
    return NextResponse.json({ error: "Your role cannot perform this action." }, { status: 403 });
  }

  const { bookingId } = await params;

  try {
    if (role === "ARTISAN" && ["APPROVE_QUOTE", "REJECT_QUOTE", "CONFIRM_HANDOVER"].includes(parsed.data.action)) {
      const owned = await prisma.booking.findUnique({ where: { id: bookingId }, select: { clientId: true } });
      if (owned?.clientId !== session.user.id) return NextResponse.json({ error: "Only the booking client can perform this action." }, { status: 403 });
    }
    let booking;
    switch (parsed.data.action) {
      case "CANCEL_BOOKING":
      case "OPEN_DISPUTE":
      case "RESOLVE_DISPUTE":
        booking = await handleException(bookingId, session.user.id, parsed.data);
        break;
      case "ASSIGN_ARTISAN":
        booking = await assignArtisan({ bookingId, artisanId: parsed.data.artisanId, expectedUpdatedAt: parsed.data.expectedUpdatedAt, actorId: session.user.id });
        break;
      case "SUBMIT_QUOTE":
        booking = await submitQuote({
          bookingId,
          artisanUserId: session.user.id,
          expectedUpdatedAt: parsed.data.expectedUpdatedAt, actorId: session.user.id,
          amount: parsed.data.amount,
          note: parsed.data.note,
        });
        break;
      case "APPROVE_QUOTE":
        booking = await respondToQuote({ bookingId, clientId: session.user.id, expectedUpdatedAt: parsed.data.expectedUpdatedAt, actorId: session.user.id, decision: "APPROVE" });
        break;
      case "REJECT_QUOTE":
        booking = await respondToQuote({ bookingId, clientId: session.user.id, expectedUpdatedAt: parsed.data.expectedUpdatedAt, actorId: session.user.id, decision: "REJECT" });
        break;
      case "START_WORK":
        booking = await startWork({ bookingId, artisanUserId: session.user.id, expectedUpdatedAt: parsed.data.expectedUpdatedAt, actorId: session.user.id });
        break;
      case "MARK_WORK_COMPLETE":
        booking = await markWorkComplete({ bookingId, artisanUserId: session.user.id, expectedUpdatedAt: parsed.data.expectedUpdatedAt, actorId: session.user.id });
        break;
      case "CONFIRM_HANDOVER":
        booking = await confirmHandover({ bookingId, clientId: session.user.id, expectedUpdatedAt: parsed.data.expectedUpdatedAt, actorId: session.user.id });
        break;
    }

    return NextResponse.json({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      quotedAmount: booking.quotedAmount?.toString() ?? null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "The repair changed. Refresh and try again." }, { status: 409 });
    }
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Booking workflow action failed", error);
    return NextResponse.json({ error: "Unable to complete the booking action." }, { status: 500 });
  }
}
