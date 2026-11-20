import type { ReactNode } from "react";
import type { BookingStatusValue } from "@/lib/booking-state";
import WorkflowButton from "./workflow-button";

type Repair = {
  id: string;
  status: BookingStatusValue;
  updatedAt: Date;
  artisan: { status: string } | null;
  quotedAmount: { toString(): string } | null;
  currency: string;
  quoteRejectedAt: Date | null;
  quoteApprovedAt: Date | null;
  quoteNote: string | null;
};

type Guidance = { owner: string; title: string; description: string };

function guidanceFor(repair: Repair): Guidance {
  const { status } = repair;
  if (["ASSIGNED", "QUOTE_APPROVED", "IN_PROGRESS"].includes(status) && repair.artisan?.status !== "ACTIVE") {
    return { owner: "Repair team", title: "Artisan support needed", description: "The repair team needs to review artisan availability before work can continue." };
  }
  switch (status) {
    case "REQUESTED":
      return { owner: "Repair team", title: "Finding your artisan", description: "Your request is in the assignment queue. The team will match it with an artisan who covers your service and city." };
    case "ASSIGNED":
      return repair.quoteRejectedAt
        ? { owner: "Your artisan", title: "Your quote is being revised", description: "You requested a revision. Your artisan can submit a new amount and notes for you to review." }
        : { owner: "Your artisan", title: "Waiting for an estimate", description: "Your artisan will assess the request and send a quote for your approval." };
    case "QUOTED":
      return { owner: "Your turn", title: "Review your quote", description: "Check the price and the artisan’s notes. You can approve the estimate or ask for a revision." };
    case "QUOTE_APPROVED":
      return { owner: "Your artisan", title: "Quote approved. Work is next.", description: "Your artisan can now start the agreed repair." };
    case "IN_PROGRESS":
      return { owner: "Your artisan", title: "Your repair is underway", description: "When the artisan marks the work finished, you’ll be asked to inspect it and confirm handover." };
    case "AWAITING_HANDOVER":
      return { owner: "Your turn", title: "Check the finished repair", description: "Inspect the work and any completion evidence. Confirm once you’ve received the item or checked the repair in person." };
    case "COMPLETED":
      return { owner: "Closed", title: "Handover confirmed", description: "Your repair record includes the quote, recorded updates and any evidence from the job." };
    case "DISPUTED":
      return { owner: "Repair team", title: "An operator is reviewing the dispute", description: "You can add supporting documents while repair work is paused." };
    case "CANCELLED":
      return { owner: "Closed", title: "This request was cancelled", description: "Open the repair history to read the recorded updates and cancellation reason, if provided." };
  }
}

export default function ClientRepairUpdate({ repair, children }: { repair: Repair; children?: ReactNode }) {
  const { owner, title, description } = guidanceFor(repair);
  const showEstimate = repair.quotedAmount != null && (repair.status === "QUOTED" || repair.quoteApprovedAt != null);
  const amount = showEstimate && repair.quotedAmount
    ? new Intl.NumberFormat("en-NG", { style: "currency", currency: repair.currency, currencyDisplay: "code", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(repair.quotedAmount.toString()))
    : null;
  const actionProps = { bookingId: repair.id, expectedUpdatedAt: repair.updatedAt.toISOString() };
  const needsDecision = repair.status === "QUOTED" || repair.status === "AWAITING_HANDOVER";
  return (
    <section className={needsDecision ? "repair-update needs-decision" : "repair-update"}>
      <p className="update-owner">{owner}</p>
      <h3>{title}</h3>
      <p className="update-description">{description}</p>
      {amount && (
        <div className="repair-estimate">
          <div><span>{repair.quoteApprovedAt ? "Approved estimate" : "Artisan’s estimate"}</span><strong>{amount}</strong></div>
          {repair.quoteNote && <p>{repair.quoteNote}</p>}
        </div>
      )}
      {children}
      {repair.status === "QUOTED" && (
        <div className="repair-decisions">
          <WorkflowButton {...actionProps} action="APPROVE_QUOTE">Approve quote</WorkflowButton>
          <WorkflowButton {...actionProps} action="REJECT_QUOTE" tone="secondary">Request revised quote</WorkflowButton>
        </div>
      )}
      {repair.status === "AWAITING_HANDOVER" && (
        <div className="repair-decisions"><WorkflowButton {...actionProps} action="CONFIRM_HANDOVER">Confirm handover</WorkflowButton></div>
      )}
    </section>
  );
}
