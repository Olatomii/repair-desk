import Link from "next/link";
import ExceptionControls from "@/components/exception-controls";
import BookingPagination, { bookingPage, BOOKING_PAGE_SIZE } from "@/components/booking-pagination";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import OperatorAssignment from "@/components/operator-assignment";
import EvidenceList from "@/components/evidence-list";
import NotificationsLink from "@/components/notifications-link";

export default async function OperatorDashboard({ searchParams }: { searchParams: Promise<{ page?: string | string[]; status?: string }> }) {
  const query = await searchParams;
  const page = bookingPage(query.page);
  const status = query.status === "DISPUTED" ? "DISPUTED" : undefined;
  const { session } = await requireRole(["OPERATOR"]);

  const [requested, activeArtisans, totalBookings, bookings, artisans, unreadCount] = await Promise.all([
    prisma.booking.count({ where: { status: "REQUESTED" } }),
    prisma.artisanProfile.count({ where: { status: "ACTIVE", user: { role: "ARTISAN" } } }),
    prisma.booking.count(),
    prisma.booking.findMany({
      where: status ? { status } : {},

      include: {
        client: { select: { name: true, email: true } },
        events: { orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 10 },
        city: true,
        serviceCategory: true,
        artisan: { include: { user: { select: { name: true } } } },
        evidence: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            kind: true,
            filename: true,
            mimeType: true,
            size: true,
            createdAt: true,
            uploadedBy: { select: { name: true, role: true } },
          },
        },
      },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * BOOKING_PAGE_SIZE,
      take: BOOKING_PAGE_SIZE + 1,
    }),
    prisma.artisanProfile.findMany({
      where: { status: "ACTIVE", user: { role: "ARTISAN" } },
      include: {
        user: { select: { name: true } },
        cities: { select: { cityId: true } },
        services: { select: { serviceId: true } },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  return (
    <main className="shell py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operator dashboard</p>
          <h1 className="mt-2 text-4xl font-black">Repair Desk operations</h1>
        </div>
        <div className="flex flex-wrap gap-3"><Link className="button-secondary" href="/operator/manage">Manage artisans and coverage</Link><NotificationsLink unreadCount={unreadCount} /></div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[["Unassigned requests", requested], ["Active artisans", activeArtisans], ["Total bookings", totalBookings]].map(([label, value]) => (
          <div className="card p-6" key={String(label)}><div className="text-sm font-bold text-[#64706a]">{label}</div><div className="mt-3 text-4xl font-black">{value}</div></div>
        ))}
      </div>

      <section className="mt-8">
        <p className="eyebrow">Repair oversight</p>
        <h2 className="mt-2 text-2xl font-black">Repairs and disputes</h2>
        <nav aria-label="Repair filters" className="mt-3 flex gap-3"><Link href="/operator" className="button-secondary">All repairs</Link><Link href="/operator?status=DISPUTED" className="button-secondary">Open disputes</Link></nav>

        <div className="mt-5 space-y-4">
          {bookings.length === 0 ? (
            <div className="card p-7 text-[#64706a]">No repairs to review.</div>
          ) : (
            bookings.slice(0, BOOKING_PAGE_SIZE).map((booking) => {
              const eligible = artisans
                .filter((artisan) => artisan.cities.some((city) => city.cityId === booking.cityId) && artisan.services.some((service) => service.serviceId === booking.serviceCategoryId))
                .map((artisan) => ({ id: artisan.id, name: artisan.user.name }));

              return (
                <article key={booking.id} className="card p-6">
                  <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#64706a]">{booking.reference} · {booking.status.replaceAll("_", " ")}</p>
                      <h3 className="mt-2 text-xl font-black">{booking.serviceCategory.name} · {booking.city.name}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64706a]">{booking.problemDescription}</p>
                      <p className="mt-3 text-sm">Client: <strong>{booking.client.name}</strong></p>
                      {booking.address ? <p className="mt-2 text-sm">Service address: {booking.address}</p> : null}
                      {booking.preferredDate ? <p className="mt-2 text-sm">Preferred date: {booking.preferredDate.toISOString().slice(0, 10)}</p> : null}
                    </div>
                    <div className="text-sm text-[#64706a] md:text-right">
                      {booking.artisan ? <>Current artisan<div className="mt-1 font-black text-[#1e2522]">{booking.artisan.user.name}</div></> : "Unassigned"}
                    </div>
                  </div>

                  <ExceptionControls id={booking.id} status={booking.status} expectedUpdatedAt={booking.updatedAt.toISOString()} role="OPERATOR" />
              <EvidenceList evidence={booking.evidence} />
                  {["REQUESTED", "ASSIGNED"].includes(booking.status) ? <OperatorAssignment expectedUpdatedAt={booking.updatedAt.toISOString()} bookingId={booking.id} currentArtisanId={booking.artisanId} artisans={eligible} /> : null}
                  <details className="mt-4"><summary className="cursor-pointer font-bold">Recent activity and reasons</summary><ol className="mt-2 space-y-2">{booking.events.map(event => <li key={event.id} className="text-sm"><strong>{event.type.replaceAll("_", " ")}</strong>: {event.note}</li>)}</ol></details>
                </article>
              );
            })
          )}
        </div>
      </section>
      <BookingPagination page={page} hasNext={bookings.length > BOOKING_PAGE_SIZE} href={status ? "/operator?status=DISPUTED" : "/operator"} />
    </main>
  );
}
