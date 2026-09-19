import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function OperatorDashboard() {
  await requireRole(["OPERATOR"]);

  const [requested, activeArtisans, totalBookings] = await Promise.all([
    prisma.booking.count({ where: { status: "REQUESTED" } }),
    prisma.artisanProfile.count({ where: { status: "ACTIVE" } }),
    prisma.booking.count(),
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
      <div className="card mt-6 p-7">
        <h2 className="text-xl font-black">Next operator milestone</h2>
        <p className="mt-2 leading-7 text-[#64706a]">
          Build assignment, artisan verification, quote oversight, dispute handling, and service analytics.
        </p>
      </div>
    </main>
  );
}
