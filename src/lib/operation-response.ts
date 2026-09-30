import { NextResponse } from "next/server";
import { Prisma } from "../../generated/prisma/client";
import { WorkflowError } from "@/lib/booking-state";
export function operationError(error: unknown) {
  if (error instanceof WorkflowError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) {
    return NextResponse.json({ error: "A matching record exists or changed concurrently. Refresh before retrying." }, { status: 409 });
  }
  console.error("Administration operation failed", error);
  return NextResponse.json({ error: "Unable to save changes." }, { status: 500 });
}
