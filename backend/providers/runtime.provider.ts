import type { ApplicationService } from '@adonisjs/core/types'

import ClockContract from '#services/clock/clock.contract'
import ClockService from '#services/clock/clock.service'
import IdGeneratorContract from '#services/id-generator/id-generator.contract'
import IdGeneratorService from '#services/id-generator/id-generator.service'
import ReporterFingerprintContract from '#services/reporter-fingerprint/reporter-fingerprint.contract'
import ReporterFingerprintService from '#services/reporter-fingerprint/reporter-fingerprint.service'

/**
 * What comes from the runtime and the test needs to pin: the clock and the id generator
 * (`_standards/solid.md` §2, "When to create a contract"). The use-case asks for the
 * contract; the unit test passes the `.fake.ts`.
 *
 * `bind`: both implementations are stateless. Static import, unlike
 * `storage.provider.ts`, because neither reads configuration or a service of the
 * framework. _doc-lib/adonisjs.md#guides/concepts/dependency-injection.
 */
export default class RuntimeProvider {
  constructor(protected app: ApplicationService) {}

  register() {
    this.app.container.bind(ClockContract, (resolver) =>
      resolver.make(ClockService),
    )
    this.app.container.bind(IdGeneratorContract, (resolver) =>
      resolver.make(IdGeneratorService),
    )
    this.app.container.bind(ReporterFingerprintContract, (resolver) =>
      resolver.make(ReporterFingerprintService),
    )
  }
}
