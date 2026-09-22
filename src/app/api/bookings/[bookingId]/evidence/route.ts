import { rejectCrossOrigin, readLimitedBody } from "@/lib/request-validation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  roleCanUploadEvidence,
  evidenceMatchesType,
  maxEvidenceBytes,
  statusAllowsEvidence,
  validateEvidenceMetadata,
  type EvidenceKindValue,
} from "@/lib/evidence";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const role = (session.user as typeof session.user & { role?: string }).role ?? "CLIENT";
  const { bookingId } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { artisan: { select: { userId: true, status: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const canAccess =
    role === "OPERATOR" ||
    (role === "CLIENT" && booking.clientId === session.user.id) ||
    (role === "ARTISAN" && booking.artisan?.userId === session.user.id && booking.artisan.status === "ACTIVE");

  if (!canAccess) {
    return NextResponse.json({ error: "You cannot add evidence to this booking" }, { status: 403 });
  }

  let form: FormData;
  try {
    const body = await readLimitedBody(request, maxEvidenceBytes() + 16_384);
    form = await new Response(body, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload form." }, { status: 400 });
  }
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "") as EvidenceKindValue;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  }

  const validationError = validateEvidenceMetadata({ kind, mimeType: file.type, size: file.size });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!roleCanUploadEvidence(role, kind)) {
    return NextResponse.json({ error: "That evidence type is not allowed for your role" }, { status: 403 });
  }

  if (!statusAllowsEvidence(role, kind, booking.status)) {
    return NextResponse.json(
      { error: "That evidence type cannot be added at this stage of the repair." },
      { status: 409 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!evidenceMatchesType(bytes, file.type)) {
    return NextResponse.json({ error: "File content does not match its type." }, { status: 400 });
  }

  const evidence = await prisma.$transaction(async (tx) => {
    // Lock through a conditional write so reassignment/lifecycle changes cannot
    // invalidate the authorization checked before parsing the upload.
    const locked = await tx.booking.updateMany({
      where: { id: bookingId, updatedAt: booking.updatedAt, status: booking.status, artisanId: booking.artisanId },
      data: { updatedAt: new Date(Math.max(Date.now(), booking.updatedAt.getTime() + 1)) },
    });
    if (locked.count !== 1) return null;
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

    const notifications: Array<{ userId: string; title: string; body: string; href: string }> = [];
    if (booking.clientId !== session.user.id) {
      notifications.push({
        userId: booking.clientId,
        title: "New repair evidence",
        body: `${file.name.slice(0, 100)} was added to ${booking.reference}.`,
        href: "/client",
      });
    }
    if (booking.artisan?.userId && booking.artisan.userId !== session.user.id) {
      notifications.push({
        userId: booking.artisan.userId,
        title: "New repair evidence",
        body: `${file.name.slice(0, 100)} was added to ${booking.reference}.`,
        href: "/artisan",
      });
    }

    if (notifications.length > 0) {
      await tx.notification.createMany({ data: notifications });
    }

    return created;
  });

  if (!evidence) return NextResponse.json({ error: "Booking changed. Refresh and try again." }, { status: 409 });
  return NextResponse.json(evidence, { status: 201 });
}
