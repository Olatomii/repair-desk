import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from "node:fs";
import { rootCertificates } from "node:tls";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encryptBackup } from "./backup-crypto.mjs";

// No connection strings in argv, logs, or artifacts. Only the public schema is exported.
let certificateDirectory;
try {
  const url = new URL(process.env.BACKUP_DATABASE_URL);
  if (!process.env.BACKUP_PUBLIC_KEY || !url.hostname.endsWith(".neon.tech")) throw Error("Invalid configuration");
  // The minimal PostgreSQL image may not retain an OS certificate bundle.
  // Use Node's maintained public trust roots without disabling TLS verification.
  certificateDirectory = mkdtempSync(join(tmpdir(), "repair-desk-ca-"));
  const certificatePath = join(certificateDirectory, "roots.pem");
  writeFileSync(certificatePath, rootCertificates.join("\n"), { mode: 0o600 });
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: "verify-full", PGSSLROOTCERT: certificatePath, PGCONNECT_TIMEOUT: "30" };
  delete env.BACKUP_DATABASE_URL;
  const dump = spawnSync("pg_dump", ["--format=custom", "--schema=public", "--no-owner", "--no-acl", "--lock-wait-timeout=30s"], { env, timeout: 240_000, maxBuffer: 16 * 1024 * 1024 });
  if (dump.status !== 0 || !dump.stdout?.subarray(0, 5).equals(Buffer.from("PGDMP"))) {
    const error = dump.stderr?.toString() ?? "";
    // Emit only a fixed diagnostic category, never raw PostgreSQL stderr.
    const category = /certificate|SSL|TLS/i.test(error) ? "TLS"
      : /permission|authentication|password/i.test(error) ? "ACCESS"
      : /timeout|connect|resolve/i.test(error) ? "CONNECTION"
      : dump.error?.code === "ENOBUFS" ? "SIZE_LIMIT" : "EXPORT";
    console.error(`Backup failure category: ${category}`);
    throw Error("Export failed");
  }
  const archive = JSON.stringify(encryptBackup(dump.stdout, process.env.BACKUP_PUBLIC_KEY));
  if (Buffer.byteLength(archive) > 24 * 1024 * 1024) throw Error("Retention size cap exceeded");
  writeFileSync("repair-desk-backup.encrypted.json", archive, { flag: "wx", mode: 0o600 });
  console.log("Encrypted public-schema backup created. No plaintext archive written to disk.");
} catch {
  // PostgreSQL errors may contain sensitive connection details. Keep hosted logs generic.
  console.error("Backup failed. Check database availability, read-only grants, TLS, public key, and the 16 MB dump / 24 MB encrypted archive limit. No backup was published.");
  process.exitCode = 1;
} finally {
  if (certificateDirectory) {
    unlinkSync(join(certificateDirectory, "roots.pem"));
    rmdirSync(certificateDirectory);
  }
}
