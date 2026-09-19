import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function ArtisanDashboard() {
  const { session } = await requireRole(["ARTISAN"]);

  const profile = await prisma.artisanProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      bookings: {
        include: { serviceCategory: true },
        orderBy: { createdAt: "desc" },
        take: 12,
      },
    },
  });

  return (
    <main className="shell py-12">
      <p className="eyebrow">Artisan dashboard</p>
      <h1 className="mt-2 text-4xl font-black">Assigned work</h1>
      <div className="card mt-8 p-7">
        {!profile ? (
          <p>Your artisan profile has not been created yet.</p>
        ) : profile.bookings.length === 0 ? (
          <p>No jobs are currently assigned.</p>
        ) : (
          <div className="space-y-3">
            {profile.bookings.map((booking) => (
              <div key={booking.id} className="border-b border-black/8 pb-3">
                <strong>{booking.reference}</strong> — {booking.serviceCategory.name} —{" "}
                {booking.status.replaceAll("_", " ")}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
