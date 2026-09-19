import Link from "next/link";

export default function NotificationsLink({ unreadCount }: { unreadCount: number }) {
  return (
    <Link href="/notifications" className="button-secondary">
      Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
    </Link>
  );
}
