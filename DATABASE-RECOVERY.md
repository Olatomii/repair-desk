# Database recovery and migration adoption

## Current status

Production moved to Neon Free (PostgreSQL 18) on September 24, 2026. The Render
web service remains free. Its private `DATABASE_URL` uses the Neon direct endpoint
with `sslmode=verify-full`; Blueprint sync no longer replaces that value.
No paid plan was activated.

The cutover archive was restored locally and then into Neon's empty public
schema. Counts and content hashes matched for all 13 application tables. Prisma
reported no schema drift, baseline `0_init` was marked applied, and migration
status/deploy checks reported no pending migrations. Do not edit that baseline.

Live signup, login, booking, assignment, quoting, approval, work, evidence upload
and download, handover, notifications and logout passed after cutover. Temporary
test records were removed and existing table hashes remained unchanged. The
database-aware health endpoint returned HTTP 200 again on September 30, 2026.
Web startup remains `npm start`; schema changes never run on restart.

## Hosting decision

The owner selected free hosting. Neon project `bold-truth-48797948` holds the
production database. Its production branch showed no expiry and a six-hour
recovery history at cutover; check current account limits before relying on them.

The old Render database `dpg-dan5khbtqb8s73amjid0-a` is retained as a cutover
snapshot, not a live replica. Its October 19, 2026 expiry no longer controls the
live app's database lifetime. Do not point the app back to it without reconciling
writes made on Neon since cutover. Do not delete it as part of routine cleanup.
The temporary migration IP allowance was removed on September 30, 2026;
Render confirmed an empty database IP allow list, blocking external connections.

The verified cutover archive was created at `2026-09-24T06:07:13.006Z`, with
34,106 plaintext bytes and SHA-256
`88da2759311ec8427b47e62047b4e4f988cd3825f640ce6b9499921d5aa1989b`.
An encrypted owner-local copy and manifest were delivered outside the repository.
Windows DPAPI CurrentUser encryption ties this copy to the originating Windows
account/machine. The newer daily encrypted offsite workflow below supplements
this original cutover copy. Rehearse restoration periodically.

## Daily encrypted offsite exports

`.github/workflows/database-backup.yml` runs at 03:23 UTC daily and can be
triggered manually from Actions on `main`. It uses the existing public repository's
standard GitHub runner, PostgreSQL 18, and a dedicated Neon read-only login.
`BACKUP_DATABASE_URL` is a repository Actions secret; `BACKUP_PUBLIC_KEY` is a
repository variable. The database credential grants SELECT in the public schema,
not write or administration access. New tables created by `neondb_owner` inherit
the SELECT grant; revisit grants if the migration owner changes.

Only the app's public schema is exported (including authentication, evidence and
Prisma history), not Neon's separate internal/auth schemas. The workflow enforces
TLS certificate verification. It encrypts in memory using AES-256-GCM and wraps the
random key using RSA-OAEP-SHA256. Only ciphertext is uploaded to Actions artifacts;
no plaintext dump, connection URL or decryption key is published. Anyone with
artifact access can download ciphertext, so keep the owner private key secret.

Artifacts expire after seven days. Exports fail above 16 MiB, encrypted artifacts
above 24 MiB, bounding a normal seven-day schedule to at most 168 MiB. Manual runs
also consume retention space. These are deliberate free-tier bounds, not a
capacity guarantee: review failed Actions runs, storage usage and account budgets
without enabling paid overages. GitHub scheduled workflows can be delayed and can
be disabled after prolonged public-repository inactivity; verify recent successful
runs before relying on the daily recovery point. No SLA or unlimited storage is
promised. See [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).

Download a successful run's `repair-desk-encrypted-*` artifact and extract its JSON.
Recover the private key from the owner-local DPAPI copy with the delivered helper,
then keep a portable private-key copy in an owner-controlled password manager or
secure offline storage. Losing that key makes the ciphertext unrecoverable.
Neither the key nor plaintext export belongs in GitHub.

```sh
node scripts/decrypt-backup.mjs repair-desk-backup.encrypted.json private-key.pem new-private-path.dump
```

The decryptor verifies GCM authentication and SHA-256 and refuses to overwrite an
existing destination. Restore into a **new disposable database only**. A
`--schema=public` export includes CREATE SCHEMA public, so remove the initially
empty public schema from that new database before `pg_restore` (without CASCADE).
Never execute that preparation against production or any populated database.
Validate schema, counts, relationships and app behavior before any cutover.
Keep credentials in a service/password file and remove plaintext recovery files
when finished. An initial read-only export/encryption/restore drill was performed
locally; the completion report records the first hosted run verification.

## Backup and restore drill

Use PostgreSQL 18 client utilities. Configure libpq connection settings through
a private service file / password file or a secret manager. Do not put passwords
in commands, commit them, print connection strings, or upload dumps to GitHub.
External Render connections require TLS; use the dashboard's exact connection
settings. Preserve existing network restrictions and allow only the required
administrator address if access needs adjustment.

With `PGSERVICE` referring to the production connection, take a consistent
custom-format dump into a private directory outside the checkout:

```sh
pg_dump --format=custom --no-owner --no-acl --file=repair-desk.dump
pg_restore --list repair-desk.dump
```

Check both exit codes. Listing an archive does **not** prove it can be restored.
Record its timestamp, byte size and SHA-256, then retain it encrypted in durable
storage with access restricted to the owner. It contains customer information,
authentication records and evidence. Never put it on the web service's disk.

Set `PGSERVICE` to a separate, newly created empty PostgreSQL 18 database. Verify
the target host and database name before restoring. Do not use `--clean`:

```sh
pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname=restore_drill repair-desk.dump
```

Use the actual empty target database name in place of `restore_drill`; `--dbname`
overrides the database in the service file. Check the restore exit code, table
counts and representative booking/event/evidence relationships. Start an isolated
app against the restore, check authentication and a repair flow, and disable any
external notification integrations. Record recovery time and backup age. A live
source can change after the dump; compare counts against a matching snapshot or
pause writes during the measured verification window.

## Adopt Prisma Migrate on the existing database

1. Finish the backup and restore drill first. Inspect a schema-only dump for
   objects Prisma cannot represent (for example triggers or extensions). Preserve
   any such objects in the reviewed baseline or a documented separate procedure.
2. With `DATABASE_URL` supplied privately, run `npm run db:check`. Exit 0 means no
   Prisma-visible difference, 2 means drift, and 1 means failure. Stop on either
   nonzero result. Do not pipe generated diff SQL into production.
3. Inspect `_prisma_migrations` if it exists. Reconcile any existing history;
   do not overwrite checksums or mark failed migrations successful blindly.
4. On a restored copy first, then on production only after review, record the
   baseline without executing its CREATE statements:

   ```sh
   npx prisma migrate resolve --applied 0_init
   npm run db:status
   npm run db:deploy
   npm run db:check
   ```

5. Confirm existing users, bookings and evidence remain accessible. Record the
   commit, backup identifier and checks with the deployment. Freeze the baseline
   SQL once adopted; subsequent schema changes need new reviewed migrations.

Never run the initial CREATE migration directly against a populated database.
Never use `migrate reset`, `db push --accept-data-loss`, or reseeding as a repair
for production migration errors. Keep deployment migration execution explicit
until production history has been verified.

## Repeatable local verification

`npm run test:migrations` requires a loopback PostgreSQL connection with CREATEDB
permission. It creates randomly named disposable databases, verifies both fresh
deployment and baseline adoption, checks schema parity and preserved data, then
drops only the databases it created. CI also runs application tests against a
database initialized using migrations instead of `db push`.

These checks do not replace a production restore drill. Rehearse restoration
before significant schema changes and periodically thereafter; keep evidence of
the last successful drill with the owner's operational records.

