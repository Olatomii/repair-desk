# Repair Desk — Portfolio Case Study

## Problem

Informal repair coordination often happens across phone calls and chat messages. Assignment, pricing, repair progress, evidence, and handover are fragmented, which makes disputes and follow-up harder.

## Product response

Repair Desk models the full job as one auditable workflow across three roles: Client, Artisan, and Operator.

## Engineering highlights

- Designed a normalized PostgreSQL schema for users, cities, service coverage, bookings, events, evidence, and notifications.
- Implemented server-enforced RBAC and ownership checks.
- Built conditional transactional state transitions to reduce stale/concurrent workflow updates.
- Added eligibility-aware artisan assignment across city and service relationships.
- Added quote negotiation, work progress, and client-confirmed handover.
- Added authorized evidence upload/download with lifecycle-sensitive policy and file constraints.
- Added persistent in-app notifications triggered by domain events.
- Added unit tests, TypeScript checks, production builds, Playwright browser smoke tests, and GitHub Actions CI.
- Prepared a free-tier Render deployment with PostgreSQL.

## Key technical decision

The portfolio deployment stores small evidence payloads in PostgreSQL. This removes an external storage dependency and keeps authorization simple for a low-volume demo. The design documents the intended production evolution: move binary data to object storage while keeping metadata and access control in PostgreSQL.

## What this project demonstrates

Full-stack product engineering rather than isolated CRUD screens: data modeling, authentication, authorization, business-state design, transactions, validation, file handling, CI, browser testing, deployment, and technical documentation.
