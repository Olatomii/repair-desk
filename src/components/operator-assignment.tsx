"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type ArtisanOption = {
  id: string;
  name: string;
};

export default function OperatorAssignment({
  bookingId,
  expectedUpdatedAt,
  currentArtisanId,
  artisans,
}: {
  bookingId: string;
  expectedUpdatedAt: string;
  currentArtisanId?: string | null;
  artisans: ArtisanOption[];
}) {
  const router = useRouter();
  const [artisanId, setArtisanId] = useState(currentArtisanId ?? artisans[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!artisanId) {
      setError("No eligible artisan is available.");
      return;
    }

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt, action: "ASSIGN_ARTISAN", artisanId }),
      });

      const result = (await response.json()) as { error?: string };
      setPending(false);

      if (!response.ok) {
        setError(result.error ?? "Unable to assign artisan.");
        return;
      }

      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (artisans.length === 0) {
    return (
      <p className="mt-4 text-sm font-semibold text-amber-800">
        No active artisan currently covers this city and service.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="min-w-56 flex-1">
        <span className="mb-2 block text-xs font-black uppercase tracking-[.11em] text-[#64706a]">
          Eligible artisan
        </span>
        <select
          className="field"
          value={artisanId}
          onChange={(event) => setArtisanId(event.target.value)}
        >
          {artisans.map((artisan) => (
            <option key={artisan.id} value={artisan.id}>
              {artisan.name}
            </option>
          ))}
        </select>
      </label>
      <button className="button-primary" disabled={pending}>
        {pending ? "Assigning..." : currentArtisanId ? "Reassign" : "Assign artisan"}
      </button>
      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}
    </form>
  );
}
