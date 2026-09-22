"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkNotificationsRead() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function markRead() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notifications/read", { method: "POST" });
      if (!response.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Unable to update notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div><button className="button-secondary" onClick={markRead} disabled={loading}>
      {loading ? "Updating..." : "Mark all read"}
    </button>{error ? <p role="alert">{error}</p> : null}</div>
  );
}
