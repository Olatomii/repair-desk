"use client";

import { FormEvent, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Service = {
  id: string;
  name: string;
  description: string;
  mode: "HOME" | "WORKSHOP";
};

type City = {
  id: string;
  name: string;
  state: string;
  country: string;
};

export default function BookingForm({
  services,
  cities,
}: {
  services: Service[];
  cities: City[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(services[0]?.id ?? "");
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const requestKey = useRef<string | null>(null);

  const selected = useMemo(
    () => services.find((service) => service.id === selectedId),
    [selectedId, services],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const form = new FormData(event.currentTarget);
    requestKey.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current },
        body: JSON.stringify({
          serviceCategoryId: selectedId,
          cityId,
          problemDescription: String(form.get("problemDescription") ?? ""),
          address: String(form.get("address") ?? "") || undefined,
          preferredDate: String(form.get("preferredDate") ?? "") || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };

      setLoading(false);

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) requestKey.current = null;
        setError(data.error ?? "Unable to create booking.");
        return;
      }

      router.push("/client");
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (services.length === 0 || cities.length === 0) {
    return <div className="card mt-7 p-6">No services are available yet. Run the database seed.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="card mt-8 space-y-6 p-7">
      <label className="block">
        <span className="mb-2 block text-sm font-black">City</span>
        <select
          className="field"
          value={cityId}
          onChange={(event) => setCityId(event.target.value)}
          required
        >
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}, {city.state}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="mb-3 block text-sm font-black">Service</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((service) => (
            <label
              key={service.id}
              className={`cursor-pointer rounded-2xl border p-4 ${
                service.id === selectedId
                  ? "border-[#1f5b45] bg-[#edf3ef]"
                  : "border-[#d9ded8] bg-white"
              }`}
            >
              <input
                type="radio"
                name="service"
                value={service.id}
                checked={service.id === selectedId}
                onChange={() => setSelectedId(service.id)}
                className="sr-only"
              />
              <div className="text-xs font-black uppercase tracking-[.12em] text-[#64706a]">
                {service.mode === "HOME" ? "Home visit" : "Workshop"}
              </div>
              <div className="mt-2 font-black">{service.name}</div>
              <p className="mt-1 text-sm leading-6 text-[#64706a]">{service.description}</p>
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-black">Describe the problem</span>
        <textarea
          className="field min-h-32 resize-y"
          name="problemDescription"
          placeholder="For example: the kitchen sink has been leaking under the cabinet since yesterday..."
          required
          minLength={12}
        />
      </label>

      {selected?.mode === "HOME" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-black">Service address</span>
          <input
            className="field"
            name="address"
            placeholder="Area / street for the service visit"
            required
          />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-black">Preferred date</span>
        <input className="field" name="preferredDate" type="date" />
      </label>

      {error ? <p className="text-sm font-semibold text-red-700">{error}</p> : null}

      <button className="button-primary w-full" disabled={loading}>
        {loading ? "Creating request..." : "Create repair request"}
      </button>
    </form>
  );
}
