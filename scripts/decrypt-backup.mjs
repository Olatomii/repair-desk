import { readFileSync, writeFileSync } from "node:fs";
import { decryptBackup } from "./backup-crypto.mjs";
const [archive, keyFile, destination] = process.argv.slice(2);
if (!archive || !keyFile || !destination) throw Error("Usage: node scripts/decrypt-backup.mjs encrypted.json private-key.pem new-private-path.dump");
const bytes = decryptBackup(JSON.parse(readFileSync(archive, "utf8")), readFileSync(keyFile));
writeFileSync(destination, bytes, { flag: "wx", mode: 0o600 });
console.log("Decrypted archive verified. Restore only into a separate empty PostgreSQL 18 database.");
