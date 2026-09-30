# Database and deployment operations

The web process starts with `npm start`. Restarting or waking a free Render
instance must not push a schema or reseed business configuration.

For a **new, empty development/demo database**, explicitly run:

```sh
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
```

Do this once before the first deployment. The existing Repair Desk deployment
already has its schema and launch data; the audit changes require no database
schema changes or data migrations.

The repository now includes `prisma/migrations/0_init/migration.sql`, generated
from the existing Prisma schema. It creates the current schema for empty databases.
It was compared with the restored production schema and marked applied on Neon
on September 24, 2026; schema parity and migration status checks passed. Follow
[DATABASE-RECOVERY.md](DATABASE-RECOVERY.md) when adopting another existing
database. CI tests fresh installation and adoption of a db-push database.

For an existing production database, take a verified backup, inspect schema
drift, baseline Prisma Migrate against the actual schema, and apply reviewed
migrations as a deployment operation. Do not run `migrate reset` or pass
`--accept-data-loss` to make a production deployment succeed. A baseline must
not be marked applied until it has been compared with the deployed database.

If Render's dashboard overrides the Blueprint, set its build command to
`npm ci && npm run db:generate && npm run build` and its start command to
`npm start`. Confirm the effective commands after deployment.

Set `BETTER_AUTH_URL` to the public HTTPS origin. `RENDER_EXTERNAL_URL` is the
fallback when the explicit URL is absent. Keep `BETTER_AUTH_SECRET` stable,
random, and private. Requests do not trust client-supplied forwarded hosts.

The health endpoint returns 503 when PostgreSQL cannot answer a bounded query.
It does not certify data integrity or the availability of every table.

Production uses Neon Free PostgreSQL and the free Render web service. Set the
private `DATABASE_URL` to the Neon connection with `sslmode=verify-full`.
`render.yaml` uses `sync: false` so Blueprint sync preserves this external
connection. The old Render database expires on **2026-10-19**, but it is no longer
the app's data source. It contains only the pre-cutover snapshot.

The verified encrypted local backup is not an automated offsite backup; see the
recovery record for its limits and repeatable export/restore steps. Free web
services sleep after inactivity; account for the cold start in demos.
See [Render's free-instance limitations](https://render.com/docs/free).

## Regression suite

CI starts an isolated PostgreSQL service, prepares its schema and seeds, then
runs generation, lint, typecheck, Vitest, the production build, and Playwright.
Authenticated Playwright fixtures refuse non-loopback app/database hosts.
They create synthetic users and repairs only in that disposable test database.

Locally set `DATABASE_URL` to a disposable localhost PostgreSQL database, run
the setup commands above, and run `npm run test:e2e`. Set
`PLAYWRIGHT_CHANNEL=chrome` only when using an installed Chrome instead of
Playwright's downloaded Chromium. The default CI browser remains Chromium.
