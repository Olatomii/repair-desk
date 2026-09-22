import { rejectCrossOrigin, readJson } from "@/lib/request-validation";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBookingReference } from "@/lib/booking-reference";
import { createBookingSchema } from "@/lib/validators/booking";
import { createHash } from "node:crypto";
import { z } from "zod";
import { Prisma } from "../../../../generated/prisma/client";

export async function POST(request: Request) {
  const originError = rejectCrossOrigin(request);
  if (originError) return originError;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const role = (session.user as typeof session.user & { role?: string }).role ?? "CLIENT";
  if (role !== "CLIENT") {
    return NextResponse.json({ error: "Only clients can create bookings" }, { status: 403 });
  }

  const body: unknown = await readJson(request);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking details", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const key = z.uuid().safeParse(request.headers.get("idempotency-key"));
  if (!key.success) {
    return NextResponse.json({ error: "A valid request key is required." }, { status: 400 });
  }
  const id = createHash("sha256").update(`${session.user.id}:${key.data}`).digest("hex");
  const existingResponse = async () => {
    const existing = await prisma.booking.findUnique({ where: { id } });
    if (!existing) return null;
    const input = parsed.data;
    if (existing.cityId !== input.cityId || existing.serviceCategoryId !== input.serviceCategoryId ||
        existing.problemDescription !== input.problemDescription || existing.address !== (input.address || null) ||
        existing.preferredDate?.toISOString().slice(0, 10) !== (input.preferredDate || undefined)) {
      return NextResponse.json({ error: "This request key was already used for different booking details." }, { status: 409 });
    }
    return NextResponse.json({ id: existing.id, reference: existing.reference, status: existing.status });
  };
  const existing = await existingResponse();
  if (existing) return existing;

  const [city, service] = await Promise.all([
    prisma.city.findFirst({ where: { id: parsed.data.cityId, isActive: true } }),
    prisma.serviceCategory.findFirst({ where: { id: parsed.data.serviceCategoryId, isActive: true } }),
  ]);

  if (!city) return NextResponse.json({ error: "City is not available" }, { status: 404 });
  if (!service) return NextResponse.json({ error: "Service is not available" }, { status: 404 });
  if (service.mode === "HOME" && !parsed.data.address) {
    return NextResponse.json({ error: "A service address is required for home visits" }, { status: 400 });
  }

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          id,
          reference: createBookingReference(),
          clientId: session.user.id,
          serviceCategoryId: service.id,
          cityId: city.id,
          problemDescription: parsed.data.problemDescription,
          address: parsed.data.address || null,
          preferredDate: parsed.data.preferredDate ? new Date(parsed.data.preferredDate) : null,
        },
      });

      await tx.bookingEvent.create({
        data: {
          bookingId: created.id,
          actorId: session.user.id,
          type: "BOOKING_CREATED",
          note: "Client created a repair request.",
        },
      });

      const operators = await tx.user.findMany({ where: { role: "OPERATOR" }, select: { id: true } });
      if (operators.length > 0) {
        await tx.notification.createMany({
          data: operators.map((operator) => ({
            userId: operator.id,
            title: "New repair request",
            body: `${created.reference}: ${service.name} request in ${city.name}.`,
            href: "/operator",
          })),
        });
      }

      return created;
    });

    return NextResponse.json(
      { id: booking.id, reference: booking.reference, status: booking.status },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await existingResponse();
      if (existing) return existing;
    }
    console.error("Booking creation failed", error);
    return NextResponse.json({ error: "Unable to create the booking." }, { status: 500 });
  }
}
