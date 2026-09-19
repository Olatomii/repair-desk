import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBookingReference } from "@/lib/booking-reference";
import { createBookingSchema } from "@/lib/validators/booking";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const role = (session.user as typeof session.user & { role?: string }).role ?? "CLIENT";
  if (role !== "CLIENT") {
    return NextResponse.json({ error: "Only clients can create bookings" }, { status: 403 });
  }

  const body: unknown = await request.json();
  const parsed = createBookingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid booking details", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const city = await prisma.city.findFirst({
    where: {
      id: parsed.data.cityId,
      isActive: true,
    },
  });

  if (!city) {
    return NextResponse.json({ error: "City is not available" }, { status: 404 });
  }

  const service = await prisma.serviceCategory.findFirst({
    where: {
      id: parsed.data.serviceCategoryId,
      isActive: true,
    },
  });

  if (!service) {
    return NextResponse.json({ error: "Service is not available" }, { status: 404 });
  }

  if (service.mode === "HOME" && !parsed.data.address) {
    return NextResponse.json(
      { error: "A service address is required for home visits" },
      { status: 400 },
    );
  }

  const booking = await prisma.$transaction(async (tx) => {
    const created = await tx.booking.create({
      data: {
        reference: createBookingReference(),
        clientId: session.user.id,
        serviceCategoryId: service.id,
        cityId: city.id,
        problemDescription: parsed.data.problemDescription,
        address: parsed.data.address || null,
        preferredDate: parsed.data.preferredDate
          ? new Date(parsed.data.preferredDate)
          : null,
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

    return created;
  });

  return NextResponse.json(
    {
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
    },
    { status: 201 },
  );
}
