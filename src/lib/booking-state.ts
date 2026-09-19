export type BookingStatusValue =
  | "REQUESTED"
  | "ASSIGNED"
  | "QUOTED"
  | "QUOTE_APPROVED"
  | "IN_PROGRESS"
  | "AWAITING_HANDOVER"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

export type BookingWorkflowAction =
  | "ASSIGN_ARTISAN"
  | "SUBMIT_QUOTE"
  | "APPROVE_QUOTE"
  | "REJECT_QUOTE"
  | "START_WORK"
  | "MARK_WORK_COMPLETE"
  | "CONFIRM_HANDOVER";

const allowedStatuses: Record<BookingWorkflowAction, readonly BookingStatusValue[]> = {
  ASSIGN_ARTISAN: ["REQUESTED", "ASSIGNED"],
  SUBMIT_QUOTE: ["ASSIGNED"],
  APPROVE_QUOTE: ["QUOTED"],
  REJECT_QUOTE: ["QUOTED"],
  START_WORK: ["QUOTE_APPROVED"],
  MARK_WORK_COMPLETE: ["IN_PROGRESS"],
  CONFIRM_HANDOVER: ["AWAITING_HANDOVER"],
};

export function isActionAllowed(
  status: BookingStatusValue,
  action: BookingWorkflowAction,
) {
  return allowedStatuses[action].includes(status);
}

export function assertActionAllowed(
  status: BookingStatusValue,
  action: BookingWorkflowAction,
) {
  if (!isActionAllowed(status, action)) {
    throw new WorkflowError(
      "INVALID_TRANSITION",
      `Cannot ${action.toLowerCase().replaceAll("_", " ")} while booking is ${status}.`,
      409,
    );
  }
}

export class WorkflowError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}
