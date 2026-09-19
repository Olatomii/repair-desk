# Architecture

## Product boundary

Repair Desk is a service marketplace/workflow product, not merely a directory.

The core lifecycle is:

`REQUESTED → ASSIGNED → QUOTED → QUOTE_APPROVED → IN_PROGRESS → COMPLETED`

Exceptional terminal paths include `CANCELLED` and `DISPUTED`.

## Roles

### Client
- Creates a repair request.
- Reviews artisan assignment.
- Reviews and approves a quote.
- Tracks work status.
- Confirms handover.

### Artisan
- Receives assigned jobs.
- Submits quotes.
- Marks accepted work in progress.
- Records completion.

### Operator
- Reviews new requests.
- Verifies/activates artisans.
- Assigns work.
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
5. Status transitions should be implemented through service functions rather than arbitrary UI updates.
6. Every important transition should create a `BookingEvent` record for auditability.

## Geographic expansion

Cities are first-class database records. Artisans can be linked to one or more cities through `ArtisanCity`, and every booking belongs to a city. This allows expansion beyond Abeokuta without renaming or restructuring the product.

## Next implementation milestones

1. Operator assignment workflow with transaction-safe eligibility checks.
2. Artisan quote submission and client quote approval.
3. Server-enforced booking state-transition service.
4. Completion/handover confirmation.
5. File/image evidence for repair diagnosis and completion.
6. Notifications.
7. Playwright end-to-end tests.
8. Deployment and production observability.
