export const EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const EVIDENCE_KINDS = ["BEFORE", "DIAGNOSIS", "AFTER", "DOCUMENT"] as const;

export type EvidenceKindValue = (typeof EVIDENCE_KINDS)[number];

export function maxEvidenceBytes() {
  const configured = Number(process.env.MAX_EVIDENCE_BYTES ?? 2_097_152);
  return Number.isFinite(configured) && configured > 0 ? configured : 2_097_152;
}

export function validateEvidenceMetadata({
  kind,
  mimeType,
  size,
}: {
  kind: string;
  mimeType: string;
  size: number;
}) {
  if (!EVIDENCE_KINDS.includes(kind as EvidenceKindValue)) {
    return "Choose a valid evidence type.";
  }

  if (!EVIDENCE_MIME_TYPES.includes(mimeType as (typeof EVIDENCE_MIME_TYPES)[number])) {
    return "Upload a JPG, PNG, WebP, or PDF file.";
  }

  if (!Number.isFinite(size) || size <= 0) {
    return "The selected file is empty.";
  }

  if (size > maxEvidenceBytes()) {
    return `Evidence files must be ${Math.floor(maxEvidenceBytes() / 1_048_576)} MB or smaller.`;
  }

  return null;
}

export function roleCanUploadEvidence(role: string, kind: EvidenceKindValue) {
  if (role === "OPERATOR") return kind === "DOCUMENT";
  if (role === "CLIENT") return kind === "BEFORE" || kind === "DOCUMENT";
  if (role === "ARTISAN") return kind === "DIAGNOSIS" || kind === "AFTER" || kind === "DOCUMENT";
  return false;
}

export function statusAllowsEvidence(role: string, kind: EvidenceKindValue, status: string) {
  if (status === "CANCELLED") return false;
  if (role === "OPERATOR") return kind === "DOCUMENT";

  if (role === "CLIENT") {
    if (kind === "BEFORE") return status === "REQUESTED" || status === "ASSIGNED";
    return kind === "DOCUMENT" && status !== "COMPLETED";
  }

  if (role === "ARTISAN") {
    if (kind === "DIAGNOSIS") {
      return ["ASSIGNED", "QUOTED", "QUOTE_APPROVED", "IN_PROGRESS"].includes(status);
    }
    if (kind === "AFTER") {
      return status === "IN_PROGRESS" || status === "AWAITING_HANDOVER";
    }
    return kind === "DOCUMENT" && !["REQUESTED", "COMPLETED"].includes(status);
  }

  return false;
}
