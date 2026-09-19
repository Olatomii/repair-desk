import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import BookingForm from "./booking-form";

export default async function BookPage() {
  await requireRole(["CLIENT"]);

  const [services, cities] = await Promise.all([
    prisma.serviceCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        mode: true,
      },
    }),
    prisma.city.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        state: true,
        country: true,
      },
    }),
  ]);

  return (
    <main className="shell py-12">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow">Repair request</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">What needs fixing?</h1>
        <p className="mt-3 leading-7 text-[#64706a]">
          Choose your city and service, then describe the problem. An operator can assign an appropriate artisan after the request is created.
        </p>
        <BookingForm services={services} cities={cities} />
      </div>
    </main>
  );
}
