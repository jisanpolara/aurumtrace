import { randomBytes } from "node:crypto";
import { decryptBytes, encryptBytes, loadDocumentKey, sha256Hex } from "./crypto-box";

const KEY = randomBytes(32);

describe("document crypto-box", () => {
  it("round-trips encrypt → decrypt", () => {
    const plain = Buffer.from("Emirates ID scan bytes — sensitive", "utf8");
    const blob = encryptBytes(KEY, plain);
    expect(blob.equals(plain)).toBe(false); // ciphertext differs from plaintext
    expect(decryptBytes(KEY, blob).equals(plain)).toBe(true);
  });

  it("produces a different IV each time (non-deterministic ciphertext)", () => {
    const plain = Buffer.from("same input");
    expect(encryptBytes(KEY, plain).equals(encryptBytes(KEY, plain))).toBe(false);
  });

  it("detects tampering via the GCM auth tag", () => {
    const blob = encryptBytes(KEY, Buffer.from("important"));
    const i = blob.length - 1;
    blob[i] = (blob[i] ?? 0) ^ 0xff; // flip a ciphertext byte
    expect(() => decryptBytes(KEY, blob)).toThrow();
  });

  it("fails to decrypt with the wrong key", () => {
    const blob = encryptBytes(KEY, Buffer.from("secret"));
    expect(() => decryptBytes(randomBytes(32), blob)).toThrow();
  });

  it("loadDocumentKey validates a 32-byte base64 key", () => {
    const good = randomBytes(32).toString("base64");
    expect(loadDocumentKey({ DOCUMENTS_ENC_KEY: good } as NodeJS.ProcessEnv).length).toBe(32);
    expect(() => loadDocumentKey({} as NodeJS.ProcessEnv)).toThrow(/not set/);
    expect(() =>
      loadDocumentKey({ DOCUMENTS_ENC_KEY: Buffer.from("short").toString("base64") } as NodeJS.ProcessEnv),
    ).toThrow(/32 bytes/);
  });

  it("hashes plaintext deterministically", () => {
    const b = Buffer.from("doc");
    expect(sha256Hex(b)).toBe(sha256Hex(Buffer.from("doc")));
    expect(sha256Hex(b)).toHaveLength(64);
  });
});
