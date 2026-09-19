import Link from "next/link";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MarkNotificationsRead from "@/components/mark-notifications-read";

export default async function NotificationsPage() {
  const session = await requireSession();
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="shell py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Account activity</p>
          <h1 className="mt-2 text-4xl font-black">Notifications</h1>
        </div>
        <MarkNotificationsRead />
      </div>

      <div className="mt-8 space-y-3">
        {notifications.length === 0 ? (
          <div className="card p-7 text-[#64706a]">No notifications yet.</div>
        ) : (
          notifications.map((notification) => {
            const content = (
              <div className={`card p-5 ${notification.readAt ? "opacity-70" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black">{notification.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-[#64706a]">{notification.body}</p>
                  </div>
                  {!notification.readAt ? (
                    <span className="rounded-full bg-[#d36a30] px-2 py-1 text-[10px] font-black uppercase tracking-[.1em] text-white">New</span>
                  ) : null}
                </div>
              </div>
            );

            return notification.href ? (
              <Link key={notification.id} href={notification.href}>{content}</Link>
            ) : (
              <div key={notification.id}>{content}</div>
            );
          })
        )}
      </div>
    </main>
  );
}
