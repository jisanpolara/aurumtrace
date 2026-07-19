import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { decryptBytes, encryptBytes } from "./crypto-box";

/** DI token for the document store. */
export const DOCUMENT_STORE = Symbol("DOCUMENT_STORE");

/**
 * Stores document bytes encrypted at rest. Production uses object storage
 * (Supabase Storage / S3) with KMS; this local impl writes AES-256-GCM
 * ciphertext to disk so dev/test exercise the same encrypt-before-store path.
 */
export interface DocumentStore {
  put(relPath: string, plaintext: Buffer): Promise<void>;
  get(relPath: string): Promise<Buffer>;
}

export class LocalEncryptedStore implements DocumentStore {
  /** Key is resolved lazily (on first use) so construction never requires it. */
  constructor(
    private readonly root: string,
    private readonly keyProvider: () => Buffer,
  ) {}

  async put(relPath: string, plaintext: Buffer): Promise<void> {
    const full = join(this.root, relPath);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, encryptBytes(this.keyProvider(), plaintext)); // ciphertext only
  }

  async get(relPath: string): Promise<Buffer> {
    const blob = await readFile(join(this.root, relPath));
    return decryptBytes(this.keyProvider(), blob);
  }
}
