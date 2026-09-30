import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
// @ts-expect-error Node maintenance scripts run independently of the TS application.
import { encryptBackup, decryptBackup } from "../scripts/backup-crypto.mjs";
describe("encrypted database exports", () => {
  it("round trips with the owner key and rejects changed ciphertext or metadata", () => {
    const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const data = Buffer.from("PGDMP: sensitive fixture");
    const encrypted = encryptBackup(data, publicKey);
    expect(decryptBackup(encrypted, privateKey)).toEqual(data);
    expect(JSON.stringify(encrypted)).not.toContain("sensitive fixture");
    expect(() => decryptBackup({ ...encrypted, sha256: "invalid" }, privateKey)).toThrow();
    const changed = Buffer.from(encrypted.ciphertext, "base64"); changed[0] ^= 1;
    expect(() => decryptBackup({ ...encrypted, ciphertext: changed.toString("base64") }, privateKey)).toThrow();
    expect(() => decryptBackup({ ...encrypted, version: 2 }, privateKey)).toThrow();
  });
});
