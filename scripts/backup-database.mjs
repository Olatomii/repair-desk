import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { encryptBackup } from "./backup-crypto.mjs";

// No connection strings in argv, logs, or artifacts. Only the public schema is exported.
try {
  const url = new URL(process.env.BACKUP_DATABASE_URL);
  if (!process.env.BACKUP_PUBLIC_KEY || !url.hostname.endsWith(".neon.tech")) throw Error("Invalid configuration");
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: "verify-full", PGSSLROOTCERT: "/etc/ssl/certs/ca-certificates.crt", PGCONNECT_TIMEOUT: "30" };
  delete env.BACKUP_DATABASE_URL;
  const dump = spawnSync("pg_dump", ["--format=custom", "--schema=public", "--no-owner", "--no-acl", "--lock-wait-timeout=30s"], { env, timeout: 240_000, maxBuffer: 16 * 1024 * 1024 });
  if (dump.status !== 0 || !dump.stdout?.subarray(0, 5).equals(Buffer.from("PGDMP"))) throw Error("Export failed");
  const archive = JSON.stringify(encryptBackup(dump.stdout, process.env.BACKUP_PUBLIC_KEY));
  if (Buffer.byteLength(archive) > 24 * 1024 * 1024) throw Error("Retention size cap exceeded");
  writeFileSync("repair-desk-backup.encrypted.json", archive, { flag: "wx", mode: 0o600 });
  console.log("Encrypted public-schema backup created. No plaintext archive written to disk.");
} catch {
  // PostgreSQL errors may contain sensitive connection details. Keep hosted logs generic.
  console.error("Backup failed. Check database availability, read-only grants, TLS, public key, and the 16 MB dump / 24 MB encrypted archive limit. No backup was published.");
  process.exitCode = 1;
}
