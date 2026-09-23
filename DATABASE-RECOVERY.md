# Database recovery and migration adoption

## Current status

Repair Desk's Render database is `dpg-dan5khbtqb8s73amjid0-a` in Frankfurt.
The last successful metadata inspection on September 23, 2026 showed PostgreSQL
18 on the Free plan, expiring October 19, 2026. Metadata access is not a backup.
The SQL connector failed with TLS/EOF errors. No production schema comparison,
backup, restore drill, or migration baseline has been completed.

The initial migration is generated from the repository schema. It is tested on
disposable local databases; it is not proof that production has no drift.
Web startup remains `npm start`; schema changes never run on restart.

## Hosting decision

The simplest continuity option is upgrading the existing database in place,
preserving its identity and application connection. Review the exact price in
the [database dashboard](https://dashboard.render.com/d/dpg-dan5khbtqb8s73amjid0-a)
before purchase. Published pricing inspected September 22 starts at $6/month
for 256 MB compute plus $0.30/GB/month storage (taxes and other usage excluded).
The web service can remain free for a portfolio demonstration.

[Paid database recovery](https://render.com/docs/postgresql-backups) includes
point-in-time recovery: three days on Hobby workspaces, seven on Pro or higher.
Logical exports are retained by Render for seven days; retain an encrypted copy
outside Render for longer retention. Recovery does not cover dates before it
was enabled. Confirm the recovery window in the dashboard after upgrading.
Pricing source: https://render.com/pricing

Upgrade and any recurring charge require owner approval. After upgrading, align
the database plan in `render.yaml` with the selected plan and verify that the
database no longer has an expiry. Do not create a replacement or delete the
existing database just to remove the free-plan expiry.

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

