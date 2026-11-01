import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

/**
 * Builds every service, contract, repository and policy through the container, and
 * fails whatever does not boot (`_standards/backend.md` §10).
 *
 * ESLint's `no-restricted-syntax` already refuses `new Service()` in the code, but
 * it only looks at the call. The remaining defect is on the other side: the class declares
 * a dependency the container cannot resolve, and that only shows up on the
 * first request that uses it - which may be a route nobody exercises in
 * tests. Here all of them are built at once, at boot.
 *
 * The list comes from `readdir`, and is not hand-written: it is the manual list that makes a
 * new service escape the check the day someone forgets to annotate it.
 *
 * It calls no method: building is what is to be proven. A method touches the database,
 * bucket and SMTP, and this command runs in CI, where none of that exists.
 */
export default class DiCheck extends BaseCommand {
  static override commandName = 'di:check'
  static override description =
    'Builds every service, contract, repository and policy through the container and fails what does not start'

  static override options: CommandOptions = { startApp: true }

  private async classesIn(
    directory: string,
    suffix: string,
  ): Promise<string[]> {
    const path = join(this.app.appRoot.pathname, 'app', directory)

    // Recursive: a service lives in `services/<name>/<name>.service.ts` and the
    // contract in `<name>.contract.ts`.
    let entries: Array<string>

    try {
      entries = await readdir(path, { recursive: true })
    } catch {
      return []
    }

    return entries.filter((name) => name.endsWith(suffix))
  }

  override async run() {
    const targets: Array<{ directory: string; file: string }> = []

    for (const file of await this.classesIn('services', '.service.ts')) {
      targets.push({ directory: 'services', file })
    }

    // The contract is the token the provider binds: building it proves the binding,
    // not just the concrete class.
    for (const file of await this.classesIn('services', '.contract.ts')) {
      targets.push({ directory: 'services', file })
    }

    // `.repository.ts` picks up the contract (resolved by the provider) and the two
    // implementations (`.lucid.repository.ts`, `.memory.repository.ts`).
    for (const file of await this.classesIn('repositories', '.repository.ts')) {
      targets.push({ directory: 'repositories', file })
    }

    for (const file of await this.classesIn('policies', '.policy.ts')) {
      targets.push({ directory: 'policies', file })
    }

    // An empty sweep is a guard that guards nothing: a `readdir` that started looking at the
    // wrong place would give green forever.
    if (targets.length === 0) {
      this.logger.error('di:check: no class found to build')
      this.exitCode = 1
      return
    }

    const failures: string[] = []

    for (const target of targets) {
      const specifier = `#${target.directory}/${target.file.replace(/\.ts$/, '')}`

      try {
        // The imported module is `unknown` until proven to export a class.
        const loaded: unknown = await import(specifier)
        const exported = this.defaultExport(loaded)

        if (!this.isClass(exported)) continue

        await this.app.container.make(exported)
      } catch (error) {
        let reason = String(error)
        if (error instanceof Error) reason = error.message
        failures.push(`${target.directory}/${target.file}: ${reason}`)
      }
    }

    if (failures.length > 0) {
      this.logger.error(
        `di:check: ${failures.length} of ${targets.length} do not start through the container`,
      )
      for (const failure of failures) this.logger.error(`  ${failure}`)
      this.exitCode = 1
      return
    }

    this.logger.success(
      `di:check: ${targets.length} classes built by the container.`,
    )
  }

  private defaultExport(loaded: unknown): unknown {
    if (typeof loaded !== 'object' || loaded === null || !('default' in loaded))
      return undefined

    return loaded.default
  }

  private isClass(
    value: unknown,
  ): value is abstract new (...args: never[]) => unknown {
    return typeof value === 'function'
  }
}
