"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  EVIDENCE_MIME_TYPES,
  evidenceFileSize,
  validateEvidenceMetadata,
  type EvidenceKindValue,
} from "@/lib/evidence";

type Selection = { file: File; previewUrl?: string };

export default function EvidenceUploadForm({
  bookingId,
  kinds,
  maxBytes,
}: {
  bookingId: string;
  kinds: EvidenceKindValue[];
  maxBytes: number;
}) {
  const router = useRouter();
  const fieldRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const busy = useRef(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const previewUrl = selection?.previewUrl;

  useEffect(() => {
    if (previewUrl) return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const error = file ? validateEvidenceMetadata({ kind: kinds[0], mimeType: file.type, size: file.size }, maxBytes) : "";
    setFileError(error ?? "");
    setUploadError("");
    setSuccess("");
    setSelection(file ? {
      file,
      previewUrl: !error && file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    } : null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !selection || fileError) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    busy.current = true;
    setLoading(true);
    setSuccess("");
    setUploadError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}/evidence`, { method: "POST", body: formData });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?: string };
        setUploadError(data.error || "The upload failed. Try again.");
        return;
      }
      form.reset();
      setSuccess(`Added ${selection.file.name} to this repair.`);
      setSelection(null);
      router.refresh();
    } catch {
      setUploadError("Unable to reach the server. Please try again.");
    } finally {
      setLoading(false);
      busy.current = false;
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl border border-[var(--line)] bg-white p-4">
      <fieldset disabled={loading} className="grid min-w-0 gap-3 md:grid-cols-[9rem_minmax(0,1fr)_auto]">
        <legend className="mb-3 font-bold">Attach evidence</legend>
        <label>
          <span className="mb-1 block text-sm font-semibold">Type</span>
          <select className="field" name="kind" defaultValue={kinds[0]} required>
            {kinds.map(kind => <option key={kind} value={kind}>{kind.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-sm font-semibold">File</span>
          <input ref={fieldRef} className="field min-w-0" name="file" type="file" accept={EVIDENCE_MIME_TYPES.join(",")}
            aria-invalid={Boolean(fileError)} aria-describedby={fileError ? `${hintId} ${hintId}-error` : hintId}
            onChange={selectFile} required />
        </label>
        <button className="button-secondary self-end" disabled={!selection || Boolean(fileError) || loading}>
          {loading ? "Uploading…" : "Add evidence"}
        </button>
        <p id={hintId} className="text-sm text-[var(--ink-soft)] md:col-span-3">JPG, PNG, WebP or PDF up to {evidenceFileSize(maxBytes)}.</p>
        {selection && (
          <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg bg-[#f4f6fa] p-3 md:col-span-3">
            {previewUrl && <Image src={previewUrl} alt="Selected evidence preview" width={80} height={80} unoptimized
              className="h-20 w-20 rounded-md border border-[var(--line)] bg-white object-contain" />}
            <div className="min-w-0 flex-1">
              <p className="break-all text-sm font-semibold">{selection.file.name}</p>
              <p className="text-xs text-[var(--ink-soft)]">{evidenceFileSize(selection.file.size)}</p>
            </div>
            <button type="button" className="text-sm font-bold text-[#2849c7] underline" onClick={() => {
              if (fieldRef.current) fieldRef.current.value = "";
              setSelection(null);
              setFileError("");
              setUploadError("");
              fieldRef.current?.focus();
            }}>Remove file</button>
          </div>
        )}
      </fieldset>
      {fileError && <p id={`${hintId}-error`} role="alert" className="mt-2 text-sm font-semibold text-red-700">{fileError}</p>}
      {uploadError && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{uploadError}</p>}
      <p role="status" className="break-all text-sm font-semibold text-[#2849c7] empty:hidden">{success}</p>
    </form>
  );
}
