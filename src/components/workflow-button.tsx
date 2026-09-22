"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WorkflowButton({
  bookingId,
  expectedUpdatedAt,
  action,
  children,
  tone = "primary",
}: {
  bookingId: string;
  expectedUpdatedAt: string;
  action:
    | "APPROVE_QUOTE"
    | "REJECT_QUOTE"
    | "START_WORK"
    | "MARK_WORK_COMPLETE"
    | "CONFIRM_HANDOVER";
  children: React.ReactNode;
  tone?: "primary" | "secondary";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt, action }),
      });

      const result = (await response.json()) as { error?: string };
      setPending(false);

      if (!response.ok) {
        setError(result.error ?? "Unable to update this repair.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={tone === "primary" ? "button-primary" : "button-secondary"}
      >
        {pending ? "Saving..." : children}
      </button>
      {error ? <p className="mt-2 text-sm font-semibold text-red-700">{error}</p> : null}
    </div>
  );
}
