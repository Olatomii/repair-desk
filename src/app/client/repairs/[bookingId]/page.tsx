import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { bookingPage } from "@/components/booking-pagination";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

const PAGE_SIZE = 20;
const formatTime = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

const eventTitles = new Map([
  ["BOOKING_CREATED", "Repair requested"],
  ["ARTISAN_ASSIGNED", "Artisan assigned"],
  ["QUOTE_SUBMITTED", "Quote received"],
  ["QUOTE_APPROVED", "Quote approved"],
  ["QUOTE_REJECTED", "Quote revision requested"],
  ["WORK_STARTED", "Repair started"],
  ["WORK_FINISHED", "Repair ready for handover"],
  ["HANDOVER_CONFIRMED", "Handover confirmed"],
  ["BOOKING_CANCELLED", "Repair cancelled"],
  ["EVIDENCE_ADDED", "Evidence added"],
  ["DISPUTE_OPENED_QUOTE_APPROVED", "Problem reported after quote approval"],
  ["DISPUTE_OPENED_IN_PROGRESS", "Problem reported during the repair"],
  ["DISPUTE_OPENED_AWAITING_HANDOVER", "Problem reported before handover"],
  ["DISPUTE_OPENED_COMPLETED", "Problem reported after handover"],
  ["DISPUTE_RESOLVED_RESUME", "Problem resolved, previous stage restored"],
  ["DISPUTE_RESOLVED_CANCEL", "Problem resolved, repair cancelled"],
]);

function eventTitle(type: string) {
  const words = type.replaceAll("_", " ").toLowerCase();
  return eventTitles.get(type) ?? (words.charAt(0).toUpperCase() + words.slice(1));
}

type Props = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export default async function RepairHistory({ params, searchParams }: Props) {
  const session = await requireSession();
  const { bookingId } = await params;
  const page = bookingPage((await searchParams).page);
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, clientId: session.user.id },
    select: {
      reference: true,
      serviceCategory: { select: { name: true } },
      city: { select: { name: true } },
      events: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE + 1,
        select: { id: true, type: true, note: true, createdAt: true },
      },
    },
  });
  if (!booking) notFound();

  const historyPath = `/client/repairs/${encodeURIComponent(bookingId)}`;
  if (page > 1 && !booking.events.length) redirect(historyPath);
  const hasOlderEvents = booking.events.length > PAGE_SIZE;

  return (
    <main className="shell workspace-page repair-history-page py-12">
      <Link href="/client" className="button-secondary">Back to your repairs</Link>
      <header className="repair-history-header mt-6">
        <p className="eyebrow">{booking.reference}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Repair history</h1>
        <p className="mt-2">{booking.serviceCategory.name} · {booking.city.name}</p>
      </header>
      <section className="card repair-history-panel mt-8 p-6" aria-labelledby="updates-heading">
        <div className="repair-history-intro">
          <h2 id="updates-heading" className="text-xl font-black">Recorded updates</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Newest first · Lagos time (WAT)</p>
        </div>
        {booking.events.length ? (
          <ol className="repair-history-list mt-5 space-y-4">
            {booking.events.slice(0, PAGE_SIZE).map((event) => (
              <li key={event.id}>
                <time className="text-sm text-[var(--ink-soft)]" dateTime={event.createdAt.toISOString()}>
                  {formatTime.format(event.createdAt)}
                </time>
                <div className="min-w-0">
                  <h3 className="font-bold">{eventTitle(event.type)}</h3>
                  {event.note && <p className="whitespace-pre-wrap wrap-anywhere">{event.note}</p>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4">No updates have been recorded for this repair yet.</p>
        )}
        {(page > 1 || hasOlderEvents) && (
          <nav aria-label="Repair history pages" className="repair-history-pagination mt-6 flex flex-wrap items-center gap-3">
            {page > 1 && <Link className="button-secondary" href={page === 2 ? historyPath : `${historyPath}?page=${page - 1}`}>Newer updates</Link>}
            <span>Page {page}</span>
            {hasOlderEvents && <Link className="button-secondary" href={`${historyPath}?page=${page + 1}`}>Older updates</Link>}
          </nav>
        )}
      </section>
    </main>
  );
}
