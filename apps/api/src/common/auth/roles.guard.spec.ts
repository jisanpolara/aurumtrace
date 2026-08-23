import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { Role } from "@aurumtrace/shared";
import { RolesGuard } from "./roles.guard";

function guardWith(required: Role[] | undefined, role: Role | undefined) {
  const reflector = {
    getAllAndOverride: () => required,
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, principal: role ? { userId: "u", tenantId: "t", role } : undefined }) }),
  } as unknown as ExecutionContext;
  return { guard, ctx };
}

describe("RolesGuard", () => {
  it("allows any authenticated role when no @Roles is set", () => {
    const { guard, ctx } = guardWith(undefined, "auditor");
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows a role that is in the required set", () => {
    const { guard, ctx } = guardWith(["owner", "compliance_officer"], "compliance_officer");
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("forbids a role that is not in the required set (auditor cannot file)", () => {
    const { guard, ctx } = guardWith(["owner", "compliance_officer"], "auditor");
    expect(() => guard.canActivate(ctx)).toThrow(/not permitted/i);
  });

  it("forbids when there is no principal", () => {
    const { guard, ctx } = guardWith(["owner"], undefined);
    expect(() => guard.canActivate(ctx)).toThrow();
  });
});
