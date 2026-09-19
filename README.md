# Repair Desk

A full-stack multi-city repair-service platform for requesting repairs, assigning artisans, agreeing quotes before work begins, and keeping a clear record through completion.

This repository is the production-oriented evolution of an earlier interactive proof of concept.

## Portfolio objective

The project is intentionally designed to demonstrate practical full-stack engineering rather than only UI work:

- Next.js + TypeScript application architecture
- Authentication and role-based workflows
- PostgreSQL relational modeling, including multi-city service coverage
- Prisma migrations and typed database access
- Server-side validation and API endpoints
- Transactional booking creation and lifecycle transitions
- Audit/event history
- Automated tests and CI
- Docker-based local infrastructure

## City model

Repair Desk is designed as a multi-city product. Abeokuta, Ogun State is the launch city, while city availability is stored in the database rather than hard-coded into the brand.

## Roles

- **Client** — creates and tracks repair requests, approves/rejects quotes, and confirms handover.
- **Artisan** — receives assigned jobs, quotes work, starts repairs, and marks work finished.
- **Operator** — assigns eligible artisans and oversees service operations.

## Current booking lifecycle

`REQUESTED → ASSIGNED → QUOTED → QUOTE_APPROVED → IN_PROGRESS → AWAITING_HANDOVER → COMPLETED`

Quote rejection returns a booking to `ASSIGNED` for a revised quote while preserving the rejection in the audit trail.

Additional paths: `CANCELLED`, `DISPUTED`.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- PostgreSQL
- Prisma ORM 7
- Better Auth
- Zod
- Vitest
- GitHub Actions
- Docker Compose

## Local setup

### 1. Requirements

- Node.js 22+
- Docker Desktop (recommended for PostgreSQL)

### 2. Environment

Copy the example file:

```bash
cp .env.example .env
```

Generate a strong `BETTER_AUTH_SECRET` before using the project beyond local development.

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Install dependencies

```bash
npm install
```

### 5. Generate Prisma Client

```bash
npm run db:generate
```

### 6. Create the database migration

```bash
npm run db:migrate -- --name init
```

### 7. Seed launch city and service categories

```bash
npm run db:seed
```

### 8. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Testing the three roles locally

Register three accounts through the app, then promote two of them:

```bash
npm run user:role -- artisan@example.com ARTISAN
npm run user:role -- operator@example.com OPERATOR
```

Artisan promotion activates the profile and links it to all currently active launch cities and services. The third account can remain a client.

The implemented flow is:

1. Client creates a repair request.
2. Operator assigns an eligible artisan.
3. Artisan submits a quote.
4. Client approves it or requests a revised quote.
5. Artisan starts work.
6. Artisan marks the work finished.
7. Client confirms handover, completing the repair.

See `LIFECYCLE.md` for workflow integrity rules.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
```

GitHub Actions runs these checks for pushes to `main` and pull requests.

## Current scope

Implemented foundation:

- Landing page adapted from the original Repair Desk concept
- Email/password registration and sign-in
- Client / Artisan / Operator role model
- Multi-city client booking creation
- Eligible artisan assignment
- Artisan quote submission
- Client quote approval/rejection
- Artisan work start/finish transitions
- Client handover confirmation
- PostgreSQL data model
- Booking event/audit records
- Client, artisan, and operator dashboards
- Validation and workflow tests
- CI workflow
- Docker PostgreSQL environment

## Roadmap

The next portfolio-grade milestones are:

1. Photo/file evidence for diagnosis and completion
2. Notifications
3. Playwright end-to-end tests
4. Deployment
5. README screenshots and architecture diagram

## Safety / product note

The project is a portfolio application and should use sample or consented data during development. Do not store sensitive customer information or process real payments until production security, privacy, payment, and operational requirements have been reviewed.

## License

MIT
