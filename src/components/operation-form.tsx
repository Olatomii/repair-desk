"use client";
import { useRef, useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function OperationForm({ endpoint, values = {}, children, label = "Save changes" }: {
  endpoint: string; values?: Record<string, string>; children: ReactNode; label?: string;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true); setMessage(""); setFailed(false);
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { ...values };
    for (const key of new Set(data.keys())) {
      if (key.endsWith("[]")) body[key.slice(0, -2)] = data.getAll(key).filter(Boolean);
      else body[key] = data.get(key);
    }
    for (const key of ["isActive", "operator"]) if (key in body) body[key] = body[key] === "true";
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Unable to save changes.");
      setMessage("Saved successfully."); router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "Unable to reach the server. Try again."); }
    finally { busy.current = false; setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <fieldset disabled={pending} className="space-y-4">{children}<button className="button-primary" type="submit">{pending ? "Saving…" : label}</button></fieldset>
    {message ? <p role={failed ? "alert" : "status"} className={failed ? "text-sm text-red-700" : "text-sm text-[var(--green)]"}>{message}</p> : null}
  </form>;
}
