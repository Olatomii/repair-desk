"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkNotificationsRead() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function markRead() {
    setLoading(true);
    await fetch("/api/notifications/read", { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button className="button-secondary" onClick={markRead} disabled={loading}>
      {loading ? "Updating..." : "Mark all read"}
    </button>
  );
}
