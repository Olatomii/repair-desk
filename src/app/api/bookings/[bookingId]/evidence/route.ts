import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  roleCanUploadEvidence,
  validateEvidenceMetadata,
  type EvidenceKindValue,
} from "@/lib/evidence";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const role = (session.user as typeof session.user & { role?: string }).role ?? "CLIENT";
  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      artisan: { select: { userId: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const canAccess =
    role === "OPERATOR" ||
    (role === "CLIENT" && booking.clientId === session.user.id) ||
    (role === "ARTISAN" && booking.artisan?.userId === session.user.id);

  if (!canAccess) {
    return NextResponse.json({ error: "You cannot add evidence to this booking" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "") as EvidenceKindValue;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  }

  const validationError = validateEvidenceMetadata({
    kind,
    mimeType: file.type,
    size: file.size,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!roleCanUploadEvidence(role, kind)) {
    return NextResponse.json({ error: "That evidence type is not allowed for your role" }, { status: 403 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const evidence = await prisma.$transaction(async (tx) => {
    const created = await tx.bookingEvidence.create({
      data: {
        bookingId,
        uploadedById: session.user.id,
        kind,
        filename: file.name.slice(0, 180) || "evidence",
        mimeType: file.type,
        size: file.size,
        data: bytes,
      },
      select: { id: true, kind: true, filename: true, size: true, createdAt: true },
    });

    await tx.bookingEvent.create({
      data: {
        bookingId,
        actorId: session.user.id,
        type: "EVIDENCE_ADDED",
        note: `${kind.replaceAll("_", " ")} evidence added: ${file.name.slice(0, 120)}.`,
      },
    });

    const recipientIds = new Set<string>();
    if (booking.clientId !== session.user.id) recipientIds.add(booking.clientId);
    if (booking.artisan?.userId && booking.artisan.userId !== session.user.id) {
      recipientIds.add(booking.artisan.userId);
    }

    if (recipientIds.size > 0) {
      await tx.notification.createMany({
        data: [...recipientIds].map((userId) => ({
          userId,
          title: "New repair evidence",
          body: `${file.name.slice(0, 100)} was added to ${booking.reference}.`,
          href: role === "ARTISAN" ? "/client" : "/artisan",
        })),
      });
    }

    return created;
  });

  return NextResponse.json(evidence, { status: 201 });
}
