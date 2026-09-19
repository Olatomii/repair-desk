import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const role = (session.user as typeof session.user & { role?: string }).role ?? "CLIENT";
  const { evidenceId } = await params;
  const evidence = await prisma.bookingEvidence.findUnique({
    where: { id: evidenceId },
    include: {
      booking: {
        include: { artisan: { select: { userId: true } } },
      },
    },
  });

  if (!evidence) {
    return NextResponse.json({ error: "Evidence not found" }, { status: 404 });
  }

  const canAccess =
    role === "OPERATOR" ||
    (role === "CLIENT" && evidence.booking.clientId === session.user.id) ||
    (role === "ARTISAN" && evidence.booking.artisan?.userId === session.user.id);

  if (!canAccess) {
    return NextResponse.json({ error: "You cannot view this evidence" }, { status: 403 });
  }

  const blob = new Blob([Uint8Array.from(evidence.data)], { type: evidence.mimeType });
  return new Response(blob, {
    headers: {
      "Content-Type": evidence.mimeType,
      "Content-Length": String(evidence.size),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(evidence.filename)}`,
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
