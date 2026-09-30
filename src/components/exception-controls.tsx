import OperationForm from "@/components/operation-form";
import { isActionAllowed, type BookingStatusValue } from "@/lib/booking-state";
export default function ExceptionControls({ id, status, expectedUpdatedAt, role }: {
  id: string; status: BookingStatusValue; expectedUpdatedAt: string; role: "CLIENT" | "ARTISAN" | "OPERATOR";
}) {
  const options = [
    ...(role !== "ARTISAN" && isActionAllowed(status, "CANCEL_BOOKING") ? [{ action: "CANCEL_BOOKING", title: "Cancel repair", hint: "Cancellation closes this request. You can create a new request later." }] : []),
    ...(role !== "OPERATOR" && isActionAllowed(status, "OPEN_DISPUTE") ? [{ action: "OPEN_DISPUTE", title: "Report a problem", hint: "Opening a dispute pauses repair actions until an operator reviews it. Describe what happened and the outcome you need." }] : []),
    ...(role === "OPERATOR" && status === "DISPUTED" ? [{ action: "RESOLVE_DISPUTE", title: "Resolve dispute", hint: "Record your decision after reviewing both parties and their evidence. Resuming restores the exact stage before the dispute. Cancelling is unavailable for a previously completed repair. This action does not issue refunds." }] : []),
  ];
  return <div className="mt-5 space-y-3">
    {status === "DISPUTED" ? <p role="status" className="font-semibold">Dispute under review. Repair actions are paused; supporting documents can still be uploaded.</p> : null}
    {options.map(option => <details key={option.action} className="rounded-xl border border-[var(--line)] p-4">
      <summary className="cursor-pointer font-bold">{option.title}</summary>
      <div className="mt-3"><OperationForm endpoint={`/api/bookings/${id}/action`} values={{ action: option.action, expectedUpdatedAt }} label={option.title}>
        <p className="text-sm text-[var(--ink-soft)]">{option.hint}</p>
        {option.action === "RESOLVE_DISPUTE" ? <label className="block">Decision<select className="field mt-1" name="resolution"><option value="RESUME">Resume previous stage</option><option value="CANCEL">Cancel repair</option></select></label> : null}
        <label className="block">Reason<textarea className="field mt-1" name="reason" minLength={10} maxLength={1000} required rows={3} /></label>
      </OperationForm></div>
    </details>)}
  </div>;
}
