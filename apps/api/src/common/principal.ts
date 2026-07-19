import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Principal } from "@aurumtrace/shared";

export type { Principal };

/** Express request augmented with the resolved principal (set by AuthGuard). */
export interface RequestWithPrincipal {
  principal?: Principal;
  headers: Record<string, string | string[] | undefined>;
}

/** Inject the authenticated Principal into a controller handler. */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => {
    const req = ctx.switchToHttp().getRequest<RequestWithPrincipal>();
    if (!req.principal) {
      throw new Error("CurrentPrincipal used without AuthGuard");
    }
    return req.principal;
  },
);
