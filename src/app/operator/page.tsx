import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import OperatorAssignment from "@/components/operator-assignment";

export default async function OperatorDashboard() {
  await requireRole(["OPERATOR"]);

  const [requested, activeArtisans, totalBookings, bookings, artisans] = await Promise.all([
    prisma.booking.count({ where: { status: "REQUESTED" } }),
    prisma.artisanProfile.count({ where: { status: "ACTIVE" } }),
    prisma.booking.count(),
    prisma.booking.findMany({
      where: { status: { in: ["REQUESTED", "ASSIGNED"] } },
      include: {
        client: { select: { name: true, email: true } },
        city: true,
        serviceCategory: true,
        artisan: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
    prisma.artisanProfile.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { name: true } },
        cities: { select: { cityId: true } },
        services: { select: { serviceId: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return (
    <main className="shell py-12">
      <p className="eyebrow">Operator dashboard</p>
      <h1 className="mt-2 text-4xl font-black">Repair Desk operations</h1>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Unassigned requests", requested],
          ["Active artisans", activeArtisans],
          ["Total bookings", totalBookings],
        ].map(([label, value]) => (
          <div className="card p-6" key={String(label)}>
            <div className="text-sm font-bold text-[#64706a]">{label}</div>
            <div className="mt-3 text-4xl font-black">{value}</div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <div>
          <p className="eyebrow">Assignment queue</p>
          <h2 className="mt-2 text-2xl font-black">Requests needing an artisan</h2>
        </div>

        <div className="mt-5 space-y-4">
          {bookings.length === 0 ? (
            <div className="card p-7 text-[#64706a]">
              No requested or assignable repairs are waiting.
            </div>
          ) : (
            bookings.map((booking) => {
              const eligible = artisans
                .filter(
                  (artisan) =>
                    artisan.cities.some((city) => city.cityId === booking.cityId) &&
                    artisan.services.some(
                      (service) => service.serviceId === booking.serviceCategoryId,
                    ),
                )
                .map((artisan) => ({
                  id: artisan.id,
                  name: artisan.user.name,
                }));

              return (
                <article key={booking.id} className="card p-6">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#64706a]">
                        {booking.reference} · {booking.status.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-2 text-xl font-black">
                        {booking.serviceCategory.name} · {booking.city.name}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64706a]">
                        {booking.problemDescription}
                      </p>
                      <p className="mt-3 text-sm">
                        Client: <strong>{booking.client.name}</strong>
                      </p>
                    </div>
                    <div className="text-sm text-[#64706a] md:text-right">
                      {booking.artisan ? (
                        <>
                          Current artisan
                          <div className="mt-1 font-black text-[#1e2522]">
                            {booking.artisan.user.name}
                          </div>
                        </>
                      ) : (
                        "Unassigned"
                      )}
                    </div>
                  </div>

                  <OperatorAssignment
                    bookingId={booking.id}
                    currentArtisanId={booking.artisanId}
                    artisans={eligible}
                  />
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}
