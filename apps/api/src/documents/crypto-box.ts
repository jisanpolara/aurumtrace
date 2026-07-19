import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Envelope encryption for document bytes at rest (CLAUDE.md: documents must be
 * encrypted). AES-256-GCM with a per-file random IV; the output is
 * `iv(12) || authTag(16) || ciphertext`. GCM's auth tag makes tampering
 * detectable (decrypt throws). The key comes from env (a KMS-managed data key
 * in production); never logged.
 */
const ALG = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

export function loadDocumentKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const b64 = env.DOCUMENTS_ENC_KEY;
  if (!b64) throw new Error("DOCUMENTS_ENC_KEY is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("DOCUMENTS_ENC_KEY must decode to 32 bytes (AES-256)");
  }
  return key;
}

export function encryptBytes(key: Buffer, plaintext: Buffer): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALG, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]);
}

export function decryptBytes(key: Buffer, blob: Buffer): Buffer {
  const iv = blob.subarray(0, IV_LEN);
  const tag = blob.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = blob.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALG, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]);
}

/** SHA-256 (hex) of the PLAINTEXT — stored for integrity verification. */
export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
