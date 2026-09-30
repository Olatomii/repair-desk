# Repair lifecycle

The implemented repair lifecycle is:

`REQUESTED → ASSIGNED → QUOTED → QUOTE_APPROVED → IN_PROGRESS → AWAITING_HANDOVER → COMPLETED`

Quote rejection returns a booking from `QUOTED` to `ASSIGNED` so the assigned artisan can submit a revised quote. The rejection remains visible in the booking event history.

## Role responsibilities

- **Operator:** assigns an active artisan who covers both the booking city and service.
- **Artisan:** submits the quote, starts approved work, and marks the work finished.
- **Client:** approves or rejects quotes and confirms final handover.

## Integrity rules

Lifecycle mutations are centralized in `src/lib/booking-workflow.ts`. The API accepts named actions rather than arbitrary status values. Each action verifies the caller, current status, booking ownership/assignment, and relevant artisan eligibility before a conditional transactional update is made.

Important transitions append a `BookingEvent` record so the user-facing timeline and future operational audit views can explain what happened.

## Cancellation and disputes

Clients can cancel their own requests before work starts; operators can cancel
any request in those same stages. A reason of 10�1,000 characters is required.
After work starts, use a dispute rather than direct cancellation.

The booking client or active assigned artisan can open a dispute from
QUOTE_APPROVED, IN_PROGRESS, AWAITING_HANDOVER, or COMPLETED. DISPUTED pauses all
normal lifecycle actions. Participants can submit supporting DOCUMENT evidence.
Operators review events and evidence under the Open disputes filter and record a
reason when resolving. RESUME restores the exact stage recorded in the immutable
opening event; CANCEL closes an unfinished repair. A previously completed repair
cannot be cancelled. Resolution never increments completed-job counts or issues
refunds. Events and notifications are written atomically with the transition.

## Account and coverage administration

Register a client account, then run `npm run user:role -- email@example.com OPERATOR`
with a private database connection to bootstrap the first operator. Once an
operator exists, this script refuses further changes. Existing operators use
`/operator/manage`; they cannot remove their own access. Provisioning uses an
existing registered email, rejects artisan account conversion, and revokes the
changed account's sessions. Never grant operator access to an unverified person.

Clients apply at `/apply`, selecting active cities and services. Pending applicants
can revise their application but cannot activate themselves. Operators review
contact details and experience before activating, declining/suspending, or
reactivating an account. Suspension blocks new assignments and artisan work and
uploads. Existing repairs stay visible; review unresolved repairs before
suspending someone. Coverage edits affect eligibility for future assignments.
Former clients retain access to their own existing client repairs after activation.

Cities and services can be created, edited, or deactivated, without deleting
historical bookings. Service mode and URL names stay fixed. Deactivation prevents
new requests while preserving existing repairs.

All mutations use origin checks, bounded validated input and server-side
permissions. Existing-record workflow and coverage forms require an update
snapshot; conflicting writes return 409 instead of silently overwriting.
