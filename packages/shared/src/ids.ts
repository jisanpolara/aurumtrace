import { z } from "zod";

export const Uuid = z.string().uuid();
export type Uuid = z.infer<typeof Uuid>;

export const TenantId = Uuid.brand<"TenantId">();
export type TenantId = z.infer<typeof TenantId>;

export const UserId = Uuid.brand<"UserId">();
export type UserId = z.infer<typeof UserId>;
