import { maxEvidenceBytes, type EvidenceKindValue } from "@/lib/evidence";
import EvidenceUploadForm from "./evidence-upload-form";

export default function EvidenceUpload({ bookingId, kinds }: { bookingId: string; kinds: EvidenceKindValue[] }) {
  return <EvidenceUploadForm bookingId={bookingId} kinds={kinds} maxBytes={maxEvidenceBytes()} />;
}
