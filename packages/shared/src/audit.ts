import { z } from "zod";
import { TenantId, UserId, Uuid } from "./ids";

/**
 * Append-only, hash-chained audit log (CLAUDE.md: no updates/deletes).
 *
 * Each entry stores `prevHash` (the previous entry's hash within the same
 * tenant chain) and `hash` = SHA-256 over the canonical serialization of the
 * entry core prefixed with `prevHash`. The chain is verifiable end-to-end;
 * any edit/reorder/insert breaks it. The hash is computed by the writer
 * (apps/api) using Node crypto — this module only defines the deterministic
 * serialization so the writer and any verifier agree byte-for-byte.
 */

/** Genesis prev-hash for the first entry in a tenant's chain (64 hex zeros). */
export const GENESIS_HASH = "0".repeat(64);

/** Audit events emitted in Phase 1. Extend as modules land. */
export const AuditEventType = z.enum([
  "case.created",
  "intake.id_scanned",
  "screening.run",
  "risk.scored",
  "threshold.checked",
  "sourcing.completed",
  "document.uploaded",
  "report.drafted",
  "report.filed",
  "auth.signed_in",
  "auth.signed_out",
]);
export type AuditEventType = z.infer<typeof AuditEventType>;

/**
 * Audit payload: a JSON object of NON-PII facts only — ids, references,
 * decisions, amounts in fils. Never names, Emirates ID, passport, etc.
 * (PII lives in tenant-scoped, RLS-protected domain tables, referenced by id.)
 */
export const AuditPayload = z.record(z.string(), z.unknown());
export type AuditPayload = z.infer<typeof AuditPayload>;

/** What a caller provides to append an entry. */
export const AuditEntryInput = z.object({
  tenantId: TenantId,
  /** The acting user, or null for system/AI-originated events. */
  actorId: UserId.nullable(),
  event: AuditEventType,
  /** Optional reference to the domain object the event concerns. */
  resourceType: z.string().min(1).nullable().default(null),
  resourceId: Uuid.nullable().default(null),
  /**
   * Optional case this entry belongs to — queryable metadata for the case
   * timeline. NOT part of the hashed core (the row is append-only, so it cannot
   * change after insert). See packages/db/migrations/0006.
   */
  caseId: Uuid.nullable().default(null),
  payload: AuditPayload.default({}),
});
export type AuditEntryInput = z.infer<typeof AuditEntryInput>;

/** A persisted audit entry. `seq` is a per-tenant monotonic counter. */
export const AuditEntry = AuditEntryInput.extend({
  id: Uuid,
  seq: z.number().int().nonnegative(),
  prevHash: z.string().length(64),
  hash: z.string().length(64),
  createdAt: z.string().datetime(),
});
export type AuditEntry = z.infer<typeof AuditEntry>;

/** The immutable core that is hashed (everything except the hashes themselves). */
export type AuditCore = Pick<
  AuditEntry,
  | "tenantId"
  | "seq"
  | "actorId"
  | "event"
  | "resourceType"
  | "resourceId"
  | "payload"
  | "createdAt"
>;

/**
 * Deterministic serialization of an entry core. Stable key order; payload keys
 * sorted recursively so logically-equal payloads always hash identically.
 */
export function canonicalizeAuditCore(core: AuditCore): string {
  return JSON.stringify([
    core.tenantId,
    core.seq,
    core.actorId,
    core.event,
    core.resourceType,
    core.resourceId,
    sortValue(core.payload),
    core.createdAt,
  ]);
}

/** The exact string that gets hashed: prevHash concatenated with the core. */
export function auditHashInput(prevHash: string, core: AuditCore): string {
  return `${prevHash}.${canonicalizeAuditCore(core)}`;
}

function sortValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortValue);
  if (v && typeof v === "object") {
    return Object.keys(v as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortValue((v as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return v;
}
