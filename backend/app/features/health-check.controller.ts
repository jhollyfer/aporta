import type { HttpContext } from '@adonisjs/core/http'

/**
 * Container liveness probe (`_standards/architecture.md` §7).
 *
 * It answers only "the process is up and accepting requests", which is what the
 * orchestrator needs to decide whether to send traffic. It queries neither the database nor the
 * bucket, nor the frontend: a probe that depends on its neighbor restarts a healthy app
 * because the other one went down.
 *
 * It is not `@adonisjs/core/health` on purpose: its `/health/ready` reports
 * disk, memory and connections, and that response describes the infrastructure - if one
 * day it exists, it goes on another, protected route.
 *
 * `no-store` because a cached probe response is a probe lying.
 */
export default class HealthCheckController {
  handle(context: HttpContext) {
    return context.response
      .header('Cache-Control', 'no-store')
      .ok({ status: 'ok' })
  }
}
