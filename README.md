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
- Transactional booking creation
- Audit/event history
- Automated tests and CI
- Docker-based local infrastructure

## City model

Repair Desk is designed as a multi-city product. Abeokuta, Ogun State is the launch city, while city availability is stored in the database rather than hard-coded into the brand.

## Roles

- **Client** — creates and tracks repair requests.
- **Artisan** — receives assigned jobs, quotes work, and completes repairs.
- **Operator** — manages assignments, artisans, disputes, and service operations.

## Current booking lifecycle

`REQUESTED → ASSIGNED → QUOTED → QUOTE_APPROVED → IN_PROGRESS → COMPLETED`

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

### 7. Seed service categories

```bash
npm run db:seed
```

### 8. Run the app

```bash
npm run dev
```

Open `http://localhost:3000`.

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
- Client booking creation
- PostgreSQL data model
- Booking event/audit records
- Client booking dashboard
- Artisan and operator dashboard foundations
- Validation tests
- CI workflow
- Docker PostgreSQL environment

## Roadmap

The next portfolio-grade milestones are:

1. Operator-to-artisan assignment workflow
2. Artisan quote creation
3. Client quote approval/rejection
4. Server-enforced state transitions
5. Completion and handover
6. Photo/file attachments
7. Notifications
8. End-to-end tests
9. Deployment
10. README screenshots and architecture diagram

## Safety / product note

The project is a portfolio application and should use sample or consented data during development. Do not store sensitive customer information or process real payments until production security, privacy, payment, and operational requirements have been reviewed.

## License

MIT
