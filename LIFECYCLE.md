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

## Local role setup

Register accounts through the application, then promote accounts for local testing:

```bash
npm run user:role -- artisan@example.com ARTISAN
npm run user:role -- operator@example.com OPERATOR
```

Artisan promotion activates the artisan profile and links it to all currently active launch cities and services.
