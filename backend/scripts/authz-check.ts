/**
 * Fails on any change to the authorization chain of any route.
 *
 * What we want to catch here is the route that opened by accident: a `role()` that left
 * the group, an `auth()` forgotten on a new endpoint, an extra role in a list.
 * None of these changes breaks a test - the route keeps answering, just
 * to more people -, and none stands out in a big diff.
 *
 * The source is `openapi.json`, which already carries `security` and `x-roles` collected from
 * the middleware chain itself by `scripts/openapi/emit.ts`. Reading from there, and
 * not the router again, avoids a second implementation of the same reading - which
 * is how the two come to disagree.
 *
 * The baseline is versioned. An intentional change goes in the same commit as the route,
 * with `--write`, and the baseline diff is what the reviewer reads: one line per route,
 * saying who can call it.
 *
 * The output is that of every guard-rail (`_standards/backend.md` §10): each finding is
 * `{ file, line, rule, section, message }`, grouped by `section`, and the
 * process exits with 1 when the list is not empty.
 *
 * Usage:
 *   node --import @poppinss/ts-exec scripts/authz-check.ts
 *   node --import @poppinss/ts-exec scripts/authz-check.ts --write
 */

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The fields are those of `_standards/backend.md` §10, in Portuguese by definition. */
type Finding = {
  file: string
  line: number
  rule: string
  section: string
  message: string
}

type Operation = {
  readonly security?: ReadonlyArray<unknown>
  readonly 'x-roles'?: ReadonlyArray<string>
}

type Protection = Readonly<Record<string, string>>

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const DOCUMENT = join(ROOT, 'openapi.json')
const BASELINE_FILE = 'app/core/openapi/authz-baseline.json'
const BASELINE = join(ROOT, BASELINE_FILE)

/** The section of the standard that the authorization chain implements. */
const SECTION = '4.6'

export class AuthzCheck {
  async run(flags: ReadonlySet<string>): Promise<void> {
    const current = await this.#readCurrent()

    if (flags.has('--write')) {
      await writeFile(BASELINE, `${JSON.stringify(current, null, 2)}\n`, 'utf8')
      process.stdout.write(
        `${`authz:check --write: ${Object.keys(current).length} routes written.`}\n`,
      )
      return
    }

    const baseline = await this.#readBaseline()
    let findings = [this.#missingBaseline()]
    if (baseline !== undefined) findings = this.compare(baseline, current)

    this.#report(findings, Object.keys(current).length)

    if (findings.length > 0) process.exitCode = 1
  }

  /** `anonima`, `autenticada`, or the roles in order. */
  #protectionOf(operation: Operation): string {
    const roles = operation['x-roles'] ?? []
    if (roles.length > 0) return [...roles].sort().join(', ')

    if (operation.security && operation.security.length > 0)
      return 'autenticada'

    return 'anonima'
  }

  async #readCurrent(): Promise<Protection> {
    const parsed: unknown = JSON.parse(await readFile(DOCUMENT, 'utf8'))
    const paths = this.#field(parsed, 'paths')
    const byKey: Record<string, string> = {}

    if (!this.#isRecord(paths))
      throw new TypeError('openapi.json without `paths`')

    for (const [path, methods] of Object.entries(paths)) {
      if (!this.#isRecord(methods)) continue

      for (const [method, operation] of Object.entries(methods)) {
        if (!this.#isOperation(operation)) continue

        byKey[`${method.toUpperCase()} ${path}`] = this.#protectionOf(operation)
      }
    }

    return byKey
  }

  async #readBaseline(): Promise<Protection | undefined> {
    let raw: string

    try {
      raw = await readFile(BASELINE, 'utf8')
    } catch {
      return undefined
    }

    const parsed: unknown = JSON.parse(raw)

    if (!this.#isProtection(parsed))
      throw new TypeError(`${BASELINE_FILE} is not a route -> protection map`)

    return parsed
  }

  /** What changed between the baseline and the current chain, one finding per route. */
  compare(baseline: Protection, current: Protection): Array<Finding> {
    const routes = [
      ...new Set([...Object.keys(baseline), ...Object.keys(current)]),
    ].sort()
    const findings: Array<Finding> = []

    for (const route of routes) {
      const before = baseline[route]
      const after = current[route]

      if (before === after) continue

      let message = `${route}: ${before} -> ${after}`
      if (before === undefined) message = `${route}: new route, ${after}`
      if (after === undefined)
        message = `${route}: removed route, was ${before}`

      findings.push({
        file: BASELINE_FILE,
        line: 1,
        rule: 'authorization-chain-changed',
        section: SECTION,
        message: `${message}. Intentional? \`pnpm authz:check -- --write\` and commit the baseline along.`,
      })
    }

    return findings
  }

  #missingBaseline(): Finding {
    return {
      file: BASELINE_FILE,
      line: 1,
      rule: 'baseline-missing',
      section: SECTION,
      message: 'baseline missing. Run with `--write` once and commit it.',
    }
  }

  #report(findings: ReadonlyArray<Finding>, total: number): void {
    if (findings.length === 0) {
      process.stdout.write(`authz:check: ${total} routes, no change.\n`)
      return
    }

    process.stdout.write(
      `${`authz:check: ${findings.length} authorization chain changes\n`}\n`,
    )

    for (const [section, group] of Map.groupBy(
      findings,
      (finding) => finding.section,
    )) {
      process.stdout.write(`  _standards/backend.md §${section}\n`)
      for (const finding of group) {
        process.stdout.write(
          `${`    ${finding.file}:${finding.line}  [${finding.rule}] ${finding.message}`}\n`,
        )
      }
      process.stdout.write('\n')
    }
  }

  #isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  #field(value: unknown, key: string): unknown {
    if (!this.#isRecord(value)) return undefined
    return value[key]
  }

  #isOperation(value: unknown): value is Operation {
    if (!this.#isRecord(value)) return false

    const roles = value['x-roles']
    const security = value.security

    if (
      roles !== undefined &&
      !(Array.isArray(roles) && roles.every((role) => typeof role === 'string'))
    )
      return false

    return security === undefined || Array.isArray(security)
  }

  #isProtection(value: unknown): value is Protection {
    if (!this.#isRecord(value)) return false

    return Object.values(value).every(
      (protection) => typeof protection === 'string',
    )
  }
}

// Imported by the spec (`authz-check.unit.spec.ts`), the file only exposes the class;
// the check runs when it is the process.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await new AuthzCheck().run(new Set(process.argv.slice(2)))
}
