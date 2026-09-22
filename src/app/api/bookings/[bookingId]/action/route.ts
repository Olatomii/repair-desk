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
    let booking;
    switch (parsed.data.action) {
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
    if (error instanceof WorkflowError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    }
    console.error("Booking workflow action failed", error);
    return NextResponse.json({ error: "Unable to complete the booking action." }, { status: 500 });
  }
}
