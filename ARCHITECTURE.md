# Architecture

## Product boundary

Repair Desk is a service marketplace/workflow product, not merely a directory.

The core lifecycle is:

`REQUESTED → ASSIGNED → QUOTED → QUOTE_APPROVED → IN_PROGRESS → AWAITING_HANDOVER → COMPLETED`

Quote rejection returns the booking to `ASSIGNED` so the artisan can submit a revised quote. Exceptional terminal paths include `CANCELLED` and `DISPUTED`.

## Roles

### Client
- Creates a repair request.
- Reviews artisan assignment.
- Reviews and approves or rejects a quote.
- Tracks work status.
- Confirms handover.

### Artisan
- Receives assigned jobs.
- Submits quotes.
- Marks accepted work in progress.
- Marks work finished and waits for client handover confirmation.

### Operator
- Reviews new requests.
- Verifies/activates artisans.
- Assigns work only to active artisans covering the required city and service.
- Oversees disputes and platform operations.

## Technical shape

- **Next.js 16 App Router** for web UI and server endpoints.
- **TypeScript** in strict mode.
- **PostgreSQL** for durable relational state.
- **Prisma ORM 7** for schema, migrations, and typed data access.
- **Better Auth** for credential-based authentication.
- **Zod** for API input validation.
- **Vitest** for unit tests.
- **GitHub Actions** for quality gates.
- **Docker Compose** for local PostgreSQL.

## Data integrity rules

1. Every booking belongs to exactly one client, service category, and city.
2. Artisan assignment is optional until an operator assigns the booking.
3. Home-service bookings must contain a service address.
4. Price is represented as a decimal amount with an explicit currency.
5. The client never sends an arbitrary status; workflow APIs accept named actions instead.
6. State transitions are centralized in `src/lib/booking-workflow.ts`.
7. Assignment verifies artisan status, city coverage, and service coverage.
8. Only the assigned artisan can quote, start, or finish a repair.
9. Only the booking owner can approve/reject a quote or confirm handover.
10. Conditional transactional updates reduce stale-state race conditions.
11. Important transitions create `BookingEvent` records for auditability.

## Geographic expansion

Cities are first-class database records. Artisans can be linked to one or more cities through `ArtisanCity`, and every booking belongs to a city. This allows expansion beyond Abeokuta without renaming or restructuring the product.

## Workflow integrity

Lifecycle mutations are centralized in `src/lib/booking-workflow.ts`.

The API accepts named actions, validates the caller role, checks the current state, and performs conditional transactional updates. Important transitions append a `BookingEvent` audit record.

Key constraints:
- Only an operator can assign an artisan.
- Assignment requires an active artisan covering both the booking city and service.
- Only the assigned active artisan can quote, start, or finish work.
- Only the booking owner can approve/reject a quote or confirm handover.
- Artisan completion moves the booking to `AWAITING_HANDOVER`; the client alone finalizes `COMPLETED`.
- Quote rejection returns the booking to `ASSIGNED` for a revised quote while retaining the rejection event.

## Next implementation milestones

1. File/image evidence for repair diagnosis and completion.
2. Notifications.
3. Playwright end-to-end tests.
4. Deployment and production observability.
