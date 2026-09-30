import { createCipheriv, createDecipheriv, createHash, privateDecrypt, publicEncrypt, randomBytes, constants } from "node:crypto";
export function encryptBackup(bytes, publicKey) {
  const key = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(bytes), cipher.final()]);
  return {
    version: 1, createdAt: new Date().toISOString(), sha256: createHash("sha256").update(bytes).digest("hex"),
    key: publicEncrypt({ key: publicKey, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING }, key).toString("base64"),
    iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64"),
  };
}
export function decryptBackup(archive, privateKey) {
  if (archive.version !== 1) throw Error("Unsupported archive version");
  const key = privateDecrypt({ key: privateKey, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(archive.key, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(archive.iv, "base64"));
  decipher.setAuthTag(Buffer.from(archive.tag, "base64"));
  const bytes = Buffer.concat([decipher.update(Buffer.from(archive.ciphertext, "base64")), decipher.final()]);
  if (createHash("sha256").update(bytes).digest("hex") !== archive.sha256) throw Error("Backup checksum mismatch");
  return bytes;
}
