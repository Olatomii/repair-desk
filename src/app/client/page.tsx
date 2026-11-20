import BookingProgress from "@/components/booking-progress";
import ExceptionControls from "@/components/exception-controls";
import BookingPagination, { bookingPage, BOOKING_PAGE_SIZE } from "@/components/booking-pagination";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ClientRepairUpdate from "@/components/client-repair-update";
import EvidenceList from "@/components/evidence-list";
import EvidenceUpload from "@/components/evidence-upload";
import NotificationsLink from "@/components/notifications-link";

export default async function ClientDashboard({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = bookingPage((await searchParams).page);
  const { session } = await requireRole(["CLIENT", "ARTISAN"]);

  const [bookings, unreadCount] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId: session.user.id },
      include: {
        serviceCategory: true,
        city: true,
        artisan: { select: { status: true, user: { select: { name: true } } } },
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * BOOKING_PAGE_SIZE,
      take: BOOKING_PAGE_SIZE + 1,
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  return (
    <main className="shell workspace-page py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Client dashboard</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Your repairs</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/apply" className="button-secondary">Work as an artisan</Link>
          <NotificationsLink unreadCount={unreadCount} />
          {session.user.role === "CLIENT" ? <Link href="/book" className="button-primary">New repair request</Link> : null}
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {bookings.length === 0 ? (
          <div className="card p-8">
            <h2 className="text-xl font-black">No repair requests yet</h2>
            <p className="mt-2 text-[#626975]">Start with plumbing or phone repair and your request will appear here.</p>
          </div>
        ) : (
          bookings.slice(0, BOOKING_PAGE_SIZE).map((booking) => (
            <article key={booking.id} className="card job-card client-repair-card">
              <header className="repair-card-header">
                <div>
                  <p className="repair-reference">{booking.reference}</p>
                  <h2>{booking.serviceCategory.name} · {booking.city.name}</h2>
                  <p className="repair-problem">{booking.problemDescription}</p>
                </div>
                <div className="repair-card-meta">
                  <span className="repair-status">{booking.status.replaceAll("_", " ")}</span>
                  {booking.artisan && <p>Artisan · {booking.artisan.user.name}</p>}
                </div>
              </header>

              <ClientRepairUpdate repair={booking}>
                {booking.status === "AWAITING_HANDOVER" && <EvidenceList evidence={booking.evidence} />}
              </ClientRepairUpdate>

              <div className="repair-history-heading">
                <h3>Repair progress</h3>
                <Link prefetch={false} href={`/client/repairs/${booking.id}`}>View repair history <span aria-hidden="true">→</span></Link>
              </div>
              {booking.status !== "CANCELLED" && booking.status !== "DISPUTED" && <BookingProgress status={booking.status} />}
              {booking.status !== "AWAITING_HANDOVER" && <EvidenceList evidence={booking.evidence} />}
              {booking.status === "REQUESTED" || booking.status === "ASSIGNED" ? (
                <EvidenceUpload bookingId={booking.id} kinds={["BEFORE", "DOCUMENT"]} />
              ) : !["COMPLETED", "CANCELLED"].includes(booking.status) ? (
                <EvidenceUpload bookingId={booking.id} kinds={["DOCUMENT"]} />
              ) : null}

              <ExceptionControls id={booking.id} status={booking.status} expectedUpdatedAt={booking.updatedAt.toISOString()} role="CLIENT" />
            </article>
          ))
        )}
      </div>
      <BookingPagination page={page} hasNext={bookings.length > BOOKING_PAGE_SIZE} href="/client" />
    </main>
  );
}
