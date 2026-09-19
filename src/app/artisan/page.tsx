import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import ArtisanQuoteForm from "@/components/artisan-quote-form";
import WorkflowButton from "@/components/workflow-button";

export default async function ArtisanDashboard() {
  const { session } = await requireRole(["ARTISAN"]);

  const profile = await prisma.artisanProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      bookings: {
        include: {
          serviceCategory: true,
          city: true,
          client: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
    },
  });

  return (
    <main className="shell py-12">
      <p className="eyebrow">Artisan dashboard</p>
      <h1 className="mt-2 text-4xl font-black">Assigned work</h1>

      {!profile ? (
        <div className="card mt-8 p-7">
          Your artisan profile has not been created yet. An operator must activate it before jobs
          can be assigned.
        </div>
      ) : profile.bookings.length === 0 ? (
        <div className="card mt-8 p-7">No jobs are currently assigned.</div>
      ) : (
        <div className="mt-8 space-y-4">
          {profile.bookings.map((booking) => (
            <article key={booking.id} className="card p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#64706a]">
                    {booking.reference}
                  </p>
                  <h2 className="mt-2 text-xl font-black">
                    {booking.serviceCategory.name} · {booking.city.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#64706a]">
                    {booking.problemDescription}
                  </p>
                  <p className="mt-3 text-sm">
                    Client: <strong>{booking.client.name}</strong>
                  </p>
                </div>
                <span className="h-fit rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-black text-[#1f5b45]">
                  {booking.status.replaceAll("_", " ")}
                </span>
              </div>

              {booking.status === "ASSIGNED" ? (
                <>
                  {booking.quoteRejectedAt ? (
                    <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                      The previous quote was rejected. Submit a revised quote when ready.
                    </p>
                  ) : null}
                  <ArtisanQuoteForm bookingId={booking.id} />
                </>
              ) : null}

              {booking.status === "QUOTED" ? (
                <div className="mt-4 rounded-xl bg-[#f6f3ec] p-4 text-sm">
                  <strong>Quote sent:</strong> NGN {booking.quotedAmount?.toString()}
                  {booking.quoteNote ? <p className="mt-2 text-[#64706a]">{booking.quoteNote}</p> : null}
                  <p className="mt-2 text-[#64706a]">Waiting for the client to respond.</p>
                </div>
              ) : null}

              {booking.status === "QUOTE_APPROVED" ? (
                <div className="mt-4">
                  <WorkflowButton bookingId={booking.id} action="START_WORK">
                    Start repair
                  </WorkflowButton>
                </div>
              ) : null}

              {booking.status === "IN_PROGRESS" ? (
                <div className="mt-4">
                  <WorkflowButton bookingId={booking.id} action="MARK_WORK_COMPLETE">
                    Mark work finished
                  </WorkflowButton>
                </div>
              ) : null}

              {booking.status === "AWAITING_HANDOVER" ? (
                <p className="mt-4 rounded-xl bg-[#edf3ef] p-4 text-sm font-semibold text-[#1f5b45]">
                  Work is marked finished. Waiting for the client to confirm handover.
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
