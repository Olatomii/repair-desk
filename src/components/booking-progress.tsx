const steps = [
  "Requested",
  "Assigned",
  "Quote",
  "Approved",
  "Repair",
  "Handover",
  "Completed",
];
const stages: Record<string, number> = {
  REQUESTED: 0,
  ASSIGNED: 1,
  QUOTED: 2,
  QUOTE_APPROVED: 3,
  IN_PROGRESS: 4,
  AWAITING_HANDOVER: 5,
  COMPLETED: 6,
};
export default function BookingProgress({ status }: { status: string }) {
  const stage = stages[status];
  if (stage === undefined)
    return (
      <div className="booking-exception-status">
        {status.replaceAll("_", " ")}
        <span>Review the latest update and available actions below.</span>
      </div>
    );
  return (
    <ol className="booking-progress" aria-label="Repair progress">
      {steps.map((step, i) => (
        <li
          key={step}
          className={i < stage ? "done" : i === stage ? "current" : ""}
          aria-current={i === stage ? "step" : undefined}
        >
          <span aria-hidden="true">
            {i < stage ? "✓" : String(i + 1).padStart(2, "0")}
          </span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}
