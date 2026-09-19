import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import WorkflowButton from "@/components/workflow-button";

export default async function ClientDashboard() {
  const { session } = await requireRole(["CLIENT"]);

  const bookings = await prisma.booking.findMany({
    where: { clientId: session.user.id },
    include: {
      serviceCategory: true,
      city: true,
      artisan: {
        include: {
          user: true,
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 4,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <main className="shell py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Client dashboard</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Your repairs</h1>
        </div>
        <Link href="/book" className="button-primary">
          New repair request
        </Link>
      </div>

      <div className="mt-8 space-y-4">
        {bookings.length === 0 ? (
          <div className="card p-8">
            <h2 className="text-xl font-black">No repair requests yet</h2>
            <p className="mt-2 text-[#64706a]">
              Start with plumbing or phone repair and your request will appear here.
            </p>
          </div>
        ) : (
          bookings.map((booking) => (
            <article key={booking.id} className="card p-6">
              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.13em] text-[#64706a]">
                    {booking.reference}
                  </p>
                  <h2 className="mt-2 text-xl font-black">
                    {booking.serviceCategory.name} · {booking.city.name}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64706a]">
                    {booking.problemDescription}
                  </p>
                </div>
                <div className="md:text-right">
                  <span className="inline-flex rounded-full bg-[#edf3ef] px-3 py-1 text-xs font-black text-[#1f5b45]">
                    {booking.status.replaceAll("_", " ")}
                  </span>
                  <p className="mt-3 text-sm text-[#64706a]">
                    {booking.artisan ? booking.artisan.user.name : "Awaiting artisan assignment"}
                  </p>
                </div>
              </div>

              {booking.status === "QUOTED" ? (
                <div className="mt-5 rounded-2xl border border-[#d9ded8] bg-white p-5">
                  <p className="eyebrow">Quote ready</p>
                  <div className="mt-2 text-2xl font-black">
                    NGN {booking.quotedAmount?.toString()}
                  </div>
                  {booking.quoteNote ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64706a]">
                      {booking.quoteNote}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <WorkflowButton bookingId={booking.id} action="APPROVE_QUOTE">
                      Approve quote
                    </WorkflowButton>
                    <WorkflowButton
                      bookingId={booking.id}
                      action="REJECT_QUOTE"
                      tone="secondary"
                    >
                      Request revised quote
                    </WorkflowButton>
                  </div>
                </div>
              ) : null}

              {booking.status === "AWAITING_HANDOVER" ? (
                <div className="mt-5 rounded-2xl border border-[#d9ded8] bg-white p-5">
                  <p className="eyebrow">Handover</p>
                  <h3 className="mt-2 text-xl font-black">Artisan marked the repair finished</h3>
                  <p className="mt-2 text-sm leading-6 text-[#64706a]">
                    Confirm only after you have received the repaired item or inspected the completed
                    work.
                  </p>
                  <div className="mt-4">
                    <WorkflowButton bookingId={booking.id} action="CONFIRM_HANDOVER">
                      Confirm handover
                    </WorkflowButton>
                  </div>
                </div>
              ) : null}

              {booking.events.length > 0 ? (
                <details className="mt-5">
                  <summary className="cursor-pointer text-sm font-black text-[#1f5b45]">
                    Recent activity
                  </summary>
                  <ol className="mt-3 space-y-2 border-l border-[#d9ded8] pl-4 text-sm text-[#64706a]">
                    {booking.events.map((event) => (
                      <li key={event.id}>
                        <strong className="text-[#1e2522]">{event.type.replaceAll("_", " ")}</strong>
                        {event.note ? ` — ${event.note}` : ""}
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
            </article>
          ))
        )}
      </div>
    </main>
  );
}
