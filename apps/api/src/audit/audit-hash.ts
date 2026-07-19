import { createHash } from "node:crypto";
import {
  type AuditCore,
  type AuditEntry,
  auditHashInput,
  GENESIS_HASH,
} from "@aurumtrace/shared";

/** SHA-256 (hex) of the canonical core prefixed with the previous hash. */
export function computeEntryHash(prevHash: string, core: AuditCore): string {
  return createHash("sha256").update(auditHashInput(prevHash, core)).digest("hex");
}

export type ChainVerification =
  | { ok: true; length: number }
  | { ok: false; brokenAt: number; reason: string };

/**
 * Verify a tenant's audit chain end-to-end. Entries must be the full chain for
 * one tenant. Detects reordering, gaps, broken links, and tampered content.
 */
export function verifyChain(entries: AuditEntry[]): ChainVerification {
  const sorted = [...entries].sort((a, b) => a.seq - b.seq);
  let prevHash = GENESIS_HASH;

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i]!;
    if (e.seq !== i) {
      return { ok: false, brokenAt: e.seq, reason: `expected seq ${i}, got ${e.seq}` };
    }
    if (e.prevHash !== prevHash) {
      return { ok: false, brokenAt: e.seq, reason: "prev_hash does not link to previous entry" };
    }
    const core: AuditCore = {
      tenantId: e.tenantId,
      seq: e.seq,
      actorId: e.actorId,
      event: e.event,
      resourceType: e.resourceType,
      resourceId: e.resourceId,
      payload: e.payload,
      createdAt: e.createdAt,
    };
    if (computeEntryHash(prevHash, core) !== e.hash) {
      return { ok: false, brokenAt: e.seq, reason: "hash mismatch — entry was altered" };
    }
    prevHash = e.hash;
  }

  return { ok: true, length: sorted.length };
}
