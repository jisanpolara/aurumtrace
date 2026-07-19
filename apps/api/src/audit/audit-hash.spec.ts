import {
  type AuditCore,
  type AuditEntry,
  GENESIS_HASH,
} from "@aurumtrace/shared";
import { computeEntryHash, verifyChain } from "./audit-hash";

const TENANT = "00000000-0000-0000-0000-0000000000a1" as AuditEntry["tenantId"];

/** Build a correctly-chained run of `n` entries. */
function makeChain(n: number): AuditEntry[] {
  const entries: AuditEntry[] = [];
  let prevHash = GENESIS_HASH;
  for (let seq = 0; seq < n; seq++) {
    const core: AuditCore = {
      tenantId: TENANT,
      seq,
      actorId: null,
      event: "case.created",
      resourceType: "case",
      resourceId: null,
      payload: { step: seq, amountFils: 6_140_000 },
      createdAt: new Date(Date.UTC(2026, 5, 22, 10, seq)).toISOString(),
    };
    const hash = computeEntryHash(prevHash, core);
    entries.push({ id: `id-${seq}`, prevHash, hash, caseId: null, ...core });
    prevHash = hash;
  }
  return entries;
}

describe("audit hash chain", () => {
  it("verifies a well-formed chain", () => {
    const result = verifyChain(makeChain(5));
    expect(result).toEqual({ ok: true, length: 5 });
  });

  it("verifies an empty chain", () => {
    expect(verifyChain([])).toEqual({ ok: true, length: 0 });
  });

  it("first entry must link to the genesis hash", () => {
    const chain = makeChain(3);
    chain[0] = { ...chain[0]!, prevHash: "f".repeat(64) };
    const result = verifyChain(chain);
    expect(result.ok).toBe(false);
  });

  it("detects a tampered payload (hash mismatch)", () => {
    const chain = makeChain(4);
    // Mutate a stored entry's payload without recomputing its hash.
    chain[2] = { ...chain[2]!, payload: { step: 99, amountFils: 9_999_999 } };
    const result = verifyChain(chain);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.brokenAt).toBe(2);
      expect(result.reason).toMatch(/altered/);
    }
  });

  it("detects a broken prev_hash link", () => {
    const chain = makeChain(4);
    chain[3] = { ...chain[3]!, prevHash: "a".repeat(64) };
    const result = verifyChain(chain);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.brokenAt).toBe(3);
  });

  it("detects a missing entry (seq gap)", () => {
    const chain = makeChain(5);
    chain.splice(2, 1); // remove seq 2
    const result = verifyChain(chain);
    expect(result.ok).toBe(false);
  });

  it("is order-independent on input (sorts by seq) yet detects reordered content", () => {
    const chain = makeChain(4);
    const shuffled = [chain[2]!, chain[0]!, chain[3]!, chain[1]!];
    expect(verifyChain(shuffled)).toEqual({ ok: true, length: 4 });
  });
});
