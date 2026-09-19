"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function EvidenceUpload({
  bookingId,
  kinds,
}: {
  bookingId: string;
  kinds: Array<"BEFORE" | "DIAGNOSIS" | "AFTER" | "DOCUMENT">;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/bookings/${bookingId}/evidence`, {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to upload evidence.");
      return;
    }

    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl border border-[#d9ded8] bg-white p-4 md:grid-cols-[180px_1fr_auto]">
      <label>
        <span className="mb-1 block text-xs font-black uppercase tracking-[.12em] text-[#64706a]">Type</span>
        <select className="field" name="kind" defaultValue={kinds[0]} required>
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {kind.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-xs font-black uppercase tracking-[.12em] text-[#64706a]">File</span>
        <input className="field" name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required />
      </label>
      <button className="button-secondary self-end" disabled={loading}>
        {loading ? "Uploading..." : "Add evidence"}
      </button>
      {error ? <p className="text-sm font-semibold text-red-700 md:col-span-3">{error}</p> : null}
    </form>
  );
}
