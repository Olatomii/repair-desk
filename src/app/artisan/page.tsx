import BookingPagination, { bookingPage, BOOKING_PAGE_SIZE } from "@/components/booking-pagination";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ArtisanQuoteForm from "@/components/artisan-quote-form";
import WorkflowButton from "@/components/workflow-button";
import EvidenceList from "@/components/evidence-list";
import EvidenceUpload from "@/components/evidence-upload";
import NotificationsLink from "@/components/notifications-link";

export default async function ArtisanDashboard({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = bookingPage((await searchParams).page);
  const { session } = await requireRole(["ARTISAN"]);

  const [profile, unreadCount] = await Promise.all([
    prisma.artisanProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        bookings: {
          include: {
            serviceCategory: true,
            city: true,
            client: { select: { name: true } },
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
        },
      },
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  return (
    <main className="shell py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Artisan dashboard</p>
          <h1 className="mt-2 text-4xl font-black">Assigned work</h1>
        </div>
        <NotificationsLink unreadCount={unreadCount} />
      </div>

      {!profile ? (
        <div className="card mt-8 p-7">Your artisan profile has not been created yet. An operator must activate it before jobs can be assigned.</div>
      ) : profile.bookings.length === 0 ? (
        <div className="card mt-8 p-7">No jobs are currently assigned.</div>
      ) : (
        <div className="mt-8 space-y-4">
          {profile.bookings.slice(0, BOOKING_PAGE_SIZE).map((booking) => (
            <article key={booking.id} className="card p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#64706a]">{booking.reference}</p>
                  <h2 className="mt-2 text-xl font-black">{booking.serviceCategory.name} · {booking.city.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#64706a]">{booking.problemDescription}</p>
                  <p className="mt-3 text-sm">Client: <strong>{booking.client.name}</strong></p>
                  {booking.address ? <p className="mt-2 text-sm">Service address: {booking.address}</p> : null}
                  {booking.preferredDate ? <p className="mt-2 text-sm">Preferred date: {booking.preferredDate.toISOString().slice(0, 10)}</p> : null}
                </div>
                <span className="h-fit rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-black text-[#1f5b45]">{booking.status.replaceAll("_", " ")}</span>
              </div>

              {booking.status === "ASSIGNED" ? (
                <>
                  {booking.quoteRejectedAt ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">The previous quote was rejected. Submit a revised quote when ready.</p> : null}
                  <ArtisanQuoteForm expectedUpdatedAt={booking.updatedAt.toISOString()} bookingId={booking.id} />
                </>
              ) : null}

              {booking.status === "QUOTED" ? (
                <div className="mt-4 rounded-xl bg-[#f6f3ec] p-4 text-sm">
                  <strong>Quote sent:</strong> NGN {booking.quotedAmount?.toString()}
                  {booking.quoteNote ? <p className="mt-2 text-[#64706a]">{booking.quoteNote}</p> : null}
                  <p className="mt-2 text-[#64706a]">Waiting for the client to respond.</p>
                </div>
              ) : null}

              {booking.status === "QUOTE_APPROVED" ? <div className="mt-4"><WorkflowButton expectedUpdatedAt={booking.updatedAt.toISOString()} bookingId={booking.id} action="START_WORK">Start repair</WorkflowButton></div> : null}
              {booking.status === "IN_PROGRESS" ? <div className="mt-4"><WorkflowButton expectedUpdatedAt={booking.updatedAt.toISOString()} bookingId={booking.id} action="MARK_WORK_COMPLETE">Mark work finished</WorkflowButton></div> : null}
              {booking.status === "AWAITING_HANDOVER" ? <p className="mt-4 rounded-xl bg-[#edf3ef] p-4 text-sm font-semibold text-[#1f5b45]">Work is marked finished. Waiting for the client to confirm handover.</p> : null}

              <EvidenceList evidence={booking.evidence} />
              {["ASSIGNED", "QUOTED", "QUOTE_APPROVED"].includes(booking.status) ? (
                <EvidenceUpload bookingId={booking.id} kinds={["DIAGNOSIS", "DOCUMENT"]} />
              ) : booking.status === "IN_PROGRESS" ? (
                <EvidenceUpload bookingId={booking.id} kinds={["DIAGNOSIS", "AFTER", "DOCUMENT"]} />
              ) : booking.status === "AWAITING_HANDOVER" ? (
                <EvidenceUpload bookingId={booking.id} kinds={["AFTER", "DOCUMENT"]} />
              ) : null}
            </article>
          ))}
        </div>
      )}
      <BookingPagination page={page} hasNext={(profile?.bookings.length ?? 0) > BOOKING_PAGE_SIZE} href="/artisan" />
    </main>
  );
}
