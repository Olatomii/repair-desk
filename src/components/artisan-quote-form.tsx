"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ArtisanQuoteForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    const note = String(form.get("note") ?? "").trim();

    const response = await fetch(`/api/bookings/${bookingId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "SUBMIT_QUOTE",
        amount,
        note: note || undefined,
      }),
    });

    const result = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(result.error ?? "Unable to submit quote.");
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
      <label>
        <span className="mb-2 block text-xs font-black uppercase tracking-[.11em] text-[#64706a]">
          Quote (NGN)
        </span>
        <input className="field" type="number" name="amount" min="1" step="0.01" required />
      </label>
      <label>
        <span className="mb-2 block text-xs font-black uppercase tracking-[.11em] text-[#64706a]">
          Quote note
        </span>
        <input
          className="field"
          name="note"
          maxLength={600}
          placeholder="Parts, labour, diagnosis, or scope"
        />
      </label>
      <button className="button-primary" disabled={pending}>
        {pending ? "Submitting..." : "Submit quote"}
      </button>
      {error ? <p className="text-sm font-semibold text-red-700 md:col-span-3">{error}</p> : null}
    </form>
  );
}
