import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import {
  type AuditCore,
  type AuditEntry,
  type AuditEntryInput,
  GENESIS_HASH,
  type Principal,
} from "@aurumtrace/shared";
import {
  type Queryer,
  TENANT_DATABASE,
  type TenantDatabase,
} from "../common/db/tenant-database";
import { computeEntryHash, verifyChain, type ChainVerification } from "./audit-hash";

type Row = {
  id: string;
  tenant_id: string;
  seq: string;
  actor_id: string | null;
  event: string;
  resource_type: string | null;
  resource_id: string | null;
  case_id: string | null;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash: string;
  created_at: Date;
};

/**
 * The append-only, hash-chained audit writer. Every state change in the app
 * goes through `append`. The chain is per-tenant; isolation is enforced by RLS
 * via `DatabaseService.withTenant`.
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(TENANT_DATABASE) private readonly db: TenantDatabase,
  ) {}

  /** Append within an existing tenant transaction, so a state change and its
   *  audit entry commit atomically. Callers already inside `withTenant` use this. */
  async appendWithin(
    q: Queryer,
    principal: Principal,
    input: AuditEntryInput,
  ): Promise<AuditEntry> {
    // The verified principal is authoritative for tenant scope — never trust a
    // caller-supplied tenantId. Reject a mismatch rather than silently relying
    // on RLS to catch it (which would also corrupt the hash with a wrong tenant).
    if (input.tenantId !== principal.tenantId) {
      throw new BadRequestException("audit tenantId does not match principal");
    }
    const tenantId = principal.tenantId;

    // Serialize appends within a tenant so seq + prev_hash are race-free.
    await q.query("select pg_advisory_xact_lock(hashtext($1))", [tenantId]);

    const tail = await q.query<{ seq: string; hash: string }>(
      `select seq, hash from public.audit_entries
        where tenant_id = $1 order by seq desc limit 1`,
      [tenantId],
    );
    const last = tail.rows[0];
    const seq = last ? Number(last.seq) + 1 : 0;
    const prevHash = last ? last.hash : GENESIS_HASH;
    const createdAt = new Date().toISOString();

    const core: AuditCore = {
      tenantId,
      seq,
      actorId: input.actorId,
      event: input.event,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      payload: input.payload,
      createdAt,
    };
    const hash = computeEntryHash(prevHash, core);

    const inserted = await q.query<Row>(
      `insert into public.audit_entries
         (tenant_id, seq, actor_id, event, resource_type, resource_id, case_id,
          payload, prev_hash, hash, created_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       returning *`,
      [
        tenantId,
        seq,
        input.actorId,
        input.event,
        input.resourceType,
        input.resourceId,
        input.caseId ?? null,
        input.payload,
        prevHash,
        hash,
        createdAt,
      ],
    );
    return toEntry(inserted.rows[0]!);
  }

  /** Append in its own transaction (for standalone audit events). */
  async append(principal: Principal, input: AuditEntryInput): Promise<AuditEntry> {
    return this.db.withTenant(principal, (q) => this.appendWithin(q, principal, input));
  }

  async list(principal: Principal): Promise<AuditEntry[]> {
    return this.db.withTenant(principal, async (client) => {
      const res = await client.query<Row>(
        `select * from public.audit_entries where tenant_id = $1 order by seq asc`,
        [principal.tenantId],
      );
      return res.rows.map(toEntry);
    });
  }

  /** Audit entries for one case (the case timeline), oldest first. */
  async listForCase(principal: Principal, caseId: string): Promise<AuditEntry[]> {
    return this.db.withTenant(principal, async (client) => {
      const res = await client.query<Row>(
        `select * from public.audit_entries
          where tenant_id = $1 and case_id = $2 order by seq asc`,
        [principal.tenantId, caseId],
      );
      return res.rows.map(toEntry);
    });
  }

  async verify(principal: Principal): Promise<ChainVerification> {
    const entries = await this.list(principal);
    return verifyChain(entries);
  }
}

function toEntry(row: Row): AuditEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id as AuditEntry["tenantId"],
    seq: Number(row.seq),
    actorId: (row.actor_id as AuditEntry["actorId"]) ?? null,
    event: row.event as AuditEntry["event"],
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    caseId: (row.case_id as AuditEntry["caseId"]) ?? null,
    payload: row.payload ?? {},
    prevHash: row.prev_hash,
    hash: row.hash,
    createdAt:
      row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  };
}
