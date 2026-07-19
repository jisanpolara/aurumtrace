import { Controller, Get } from "@nestjs/common";
import { loadEnv } from "../config/env";

/**
 * Public, unauthenticated liveness probe. Used by the host's health check and
 * by a keep-alive ping (free tiers sleep when idle). Returns no tenant data.
 */
@Controller("health")
export class HealthController {
  @Get()
  check(): { status: "ok"; demo: boolean; time: string } {
    return {
      status: "ok",
      demo: loadEnv().DEMO_MODE,
      time: new Date().toISOString(),
    };
  }
}
