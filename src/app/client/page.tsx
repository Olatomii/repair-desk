import Link from "next/link";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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
    },
    orderBy: { createdAt: "desc" },
    take: 10,
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
            <article key={booking.id} className="card grid gap-4 p-6 md:grid-cols-[1fr_auto]">
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
            </article>
          ))
        )}
      </div>
    </main>
  );
}
