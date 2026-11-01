/**
 * Fails a backend validator without a pair in `@aporta/shared`, or with a pair that
 * diverges (`_standards/architecture.md` §10, "Adonis parity").
 *
 * The backend validates the request with VineJS, native to Adonis; the frontend validates the
 * form with the Zod from `shared/`. They are two declarations of the same rule, and the
 * symptom when they age apart is always the same: the form accepts
 * what the API refuses, or refuses for months what it already accepts. This check
 * is what keeps the two equal.
 *
 * The pair is by path and name: `app/validators/<module>/<resource>.validator.ts`
 * mirrors `shared/src/validators/<module>/<resource>.validator.ts`, and each
 * `*Validator` export on one side has the same-named one on the other. The comparison is by the
 * JSON Schema of both (VineJS's `toJSONSchema()`, Zod's `z.toJSONSchema()`,
 * _doc-lib/zod.md#json-schema): fields, required, type, ceilings and
 * enum values. A node that one side cannot represent (`vine.date()` comes out `{}`) counts
 * as a wildcard: its rule is left to the action's E2E.
 *
 * The output is that of every guard-rail (`_standards/backend.md` §10): each finding is
 * `{ file, line, rule, section, message }`, and the process exits with 1 when the
 * list is not empty.
 *
 * Usage: node --import @poppinss/ts-exec scripts/validators-check.ts
 */

import { readdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as shared from '@aporta/shared'

/** The fields are those of `_standards/backend.md` §10, in Portuguese by definition. */
type Finding = {
  file: string
  line: number
  rule: string
  section: string
  message: string
}

/** What is compared of a JSON Schema node; the rest is the shape of each generator. */
type Shape = {
  readonly types: ReadonlyArray<string>
  readonly bounds: Readonly<Record<string, number>>
  readonly values: ReadonlyArray<string>
  readonly items: Shape | undefined
  readonly properties: Readonly<Record<string, Shape>>
  readonly required: ReadonlyArray<string>
}

/** An accepted divergence, always with the reason; one that goes unused fails. */
type Exception = {
  readonly key: string
  readonly reason: string
}

type Pair = {
  readonly file: string
  readonly name: string
  readonly vine: unknown
  readonly zod: unknown
}

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..')
const VALIDATORS = join(ROOT, 'app/validators')

/** The section of the standard that the parity implements. */
const SECTION = '10'

/**
 * What the check accepts diverging. Each entry is `<Validator>.<field>` (or
 * just the validator name) plus what diverges, and says why.
 */
const EXCEPTIONS: ReadonlyArray<Exception> = [
  {
    key: 'StorageFileCreateValidator.size:maximum',
    reason:
      'the per-file ceiling comes from `UPLOAD_MAX_SIZE`, and `shared/` does not read ENV; the server is who refuses',
  },
]

/**
 * The password confirmation: in the backend, `password()` uses `confirmed()`, which reads
 * `passwordConfirmation` from the raw input without declaring it (so it never reaches
 * `merge()`); in `shared/` the field is declared (`frontend.md` §4). The pair holds
 * when the backend has `password` and `shared/` has both.
 */
const CONFIRMATION = { field: 'passwordConfirmation', of: 'password' } as const

/** The ceilings both sides declare and the form needs to respect. */
const BOUNDS = [
  'minLength',
  'maxLength',
  'minimum',
  'maximum',
  'minItems',
  'maxItems',
] as const

export class ValidatorsCheck {
  async run(): Promise<void> {
    const pairs = await this.#readPairs()
    const raw = [
      ...pairs.flatMap((pair) => this.compare(pair)),
      ...(await this.#missingInBackend(pairs)),
    ]
    const findings = this.applyExceptions(raw, EXCEPTIONS)

    this.#report(findings, pairs.length)

    if (findings.length > 0) process.exitCode = 1
  }

  /**
   * Removes the findings that an exception covers and adds a finding per exception
   * that covered nothing: an unused exception is an old forgotten rule.
   */
  applyExceptions(
    findings: ReadonlyArray<Finding>,
    exceptions: ReadonlyArray<Exception>,
  ): Array<Finding> {
    const used = new Set<string>()
    const kept = findings.filter((finding) => {
      const hit = exceptions.find(
        (exception) =>
          finding.message.includes(`\`${exception.key.split(':')[0]}`) &&
          this.#matchesBound(finding.message, exception.key),
      )
      if (hit === undefined) return true
      used.add(hit.key)
      return false
    })

    for (const exception of exceptions) {
      if (used.has(exception.key)) continue
      kept.push(
        this.#finding(
          'scripts/validators-check.ts',
          'unused-exception',
          `the exception \`${exception.key}\` covers no divergence; remove it`,
        ),
      )
    }

    return kept
  }

  #matchesBound(message: string, key: string): boolean {
    const [, bound] = key.split(':')
    if (bound === undefined) return true
    return message.includes(`: ${bound} `)
  }

  /** The findings of a pair: no pair in `shared/`, or a diverging field. */
  compare(pair: Pair): Array<Finding> {
    if (pair.zod === undefined)
      return [
        this.#finding(
          pair.file,
          'validator-without-pair',
          `\`${pair.name}\` does not exist in \`@aporta/shared\` (shared/src/validators/${pair.file.replace('app/validators/', '')})`,
        ),
      ]

    const vine = this.#shape(this.#jsonSchemaOfVine(pair.vine))
    const zod = this.#shape(this.#jsonSchemaOfZod(pair.zod))

    return this.#diff(pair.name, '', vine, zod).map((message) =>
      this.#finding(pair.file, 'validator-diverge', message),
    )
  }

  #diff(name: string, path: string, vine: Shape, zod: Shape): Array<string> {
    const where = `\`${name}${path}\``
    const found: Array<string> = []

    // A node that one side cannot represent (`vine.date()` comes out `{}`) is a wildcard.
    if (this.#isOpaque(vine) || this.#isOpaque(zod)) return found

    if (
      vine.types.length > 0 &&
      zod.types.length > 0 &&
      !this.#same(vine.types, zod.types)
    )
      found.push(
        `${where}: type ${vine.types.join('|')} in the backend, ${zod.types.join('|')} in shared`,
      )

    for (const bound of BOUNDS) {
      if (vine.bounds[bound] !== zod.bounds[bound])
        found.push(
          `${where}: ${bound} ${vine.bounds[bound] ?? '-'} in the backend, ${zod.bounds[bound] ?? '-'} in shared`,
        )
    }

    if (!this.#same(vine.values, zod.values))
      found.push(
        `${where}: values [${vine.values.join(', ')}] in the backend, [${zod.values.join(', ')}] in shared`,
      )

    const fields = new Set([
      ...Object.keys(vine.properties),
      ...Object.keys(zod.properties),
    ])

    for (const field of fields) {
      const left = vine.properties[field]
      const right = zod.properties[field]
      const child = `${path}.${field}`

      if (this.#isConfirmation(field, vine, zod)) continue

      if (left === undefined) {
        found.push(`\`${name}${child}\`: field only in shared`)
        continue
      }

      if (right === undefined) {
        found.push(`\`${name}${child}\`: field only in the backend`)
        continue
      }

      found.push(...this.#diff(name, child, left, right))
    }

    const zodRequired = zod.required.filter(
      (field) => !this.#isConfirmation(field, vine, zod),
    )
    if (
      Object.keys(vine.properties).length > 0 &&
      !this.#same(vine.required, zodRequired)
    )
      found.push(
        `${where}: required [${vine.required.join(', ')}] in the backend, [${zod.required.join(', ')}] in shared`,
      )

    if (vine.items !== undefined && zod.items !== undefined)
      found.push(...this.#diff(name, `${path}[]`, vine.items, zod.items))

    return found
  }

  #isOpaque(shape: Shape): boolean {
    return (
      shape.types.length === 0 &&
      shape.values.length === 0 &&
      shape.items === undefined &&
      Object.keys(shape.properties).length === 0
    )
  }

  #isConfirmation(field: string, vine: Shape, zod: Shape): boolean {
    return (
      field === CONFIRMATION.field &&
      vine.properties[CONFIRMATION.field] === undefined &&
      vine.properties[CONFIRMATION.of] !== undefined &&
      zod.properties[CONFIRMATION.of] !== undefined
    )
  }

  /** The node reduced to what matters; a type `anyOf` with `null` becomes a single node. */
  #shape(node: unknown): Shape {
    const branches = this.#array(this.#field(node, 'anyOf'))
    const merged = [node, ...branches]

    const types = new Set<string>()
    const values = new Set<string>()
    const bounds: Record<string, number> = {}
    let items: Shape | undefined
    let properties: Record<string, Shape> = {}
    let required: Array<string> = []

    for (const each of merged) {
      for (const type of this.#types(this.#field(each, 'type'))) types.add(type)
      for (const value of this.#array(this.#field(each, 'enum')))
        values.add(String(value))

      for (const bound of BOUNDS) {
        const value = this.#field(each, bound)
        if (typeof value === 'number') bounds[bound] = value
      }

      // VineJS exports `positive()` as `minimum: 0`, and Zod as
      // `exclusiveMinimum: 0`: the rule is the same, the shape just loses precision.
      const exclusive = this.#field(each, 'exclusiveMinimum')
      if (typeof exclusive === 'number') bounds.minimum = exclusive

      const nested = this.#field(each, 'items')
      if (nested !== undefined) items = this.#shape(nested)

      const props = this.#field(each, 'properties')
      if (this.#isRecord(props))
        properties = Object.fromEntries(
          Object.entries(props).map(([key, value]) => [
            key,
            this.#shape(value),
          ]),
        )

      const list = this.#array(this.#field(each, 'required'))
      if (list.length > 0) required = list.map(String)
    }

    // An enum declares the values; the `type: string` that Zod adds and VineJS
    // does not is not a rule difference.
    if (values.size > 0) types.clear()

    return {
      types: [...types].sort(),
      bounds,
      values: [...values].sort(),
      items,
      properties,
      required: [...required].sort(),
    }
  }

  #jsonSchemaOfVine(validator: unknown): unknown {
    const generate = this.#field(validator, 'toJSONSchema')
    if (typeof generate !== 'function') return {}
    return Reflect.apply(generate, validator, [])
  }

  #jsonSchemaOfZod(schema: unknown): unknown {
    if (!(schema instanceof shared.z.ZodType)) return {}
    return shared.z.toJSONSchema(schema, {
      io: 'output',
      unrepresentable: 'any',
    })
  }

  async #readPairs(): Promise<Array<Pair>> {
    const sharedExports = new Map<string, unknown>(Object.entries(shared))
    const listing = await readdir(VALIDATORS, { recursive: true })
    const files = listing
      .filter((file) => file.endsWith('.validator.ts'))
      .sort()
    const pairs: Array<Pair> = []

    for (const file of files) {
      const module: unknown = await import(
        `#validators/${file.replace(/\.ts$/, '')}`
      )

      if (!this.#isRecord(module)) continue

      for (const [name, vine] of Object.entries(module)) {
        if (!name.endsWith('Validator')) continue
        pairs.push({
          file: `app/validators/${file}`,
          name,
          vine,
          zod: sharedExports.get(name),
        })
      }
    }

    return pairs
  }

  /** A `shared/` validator that the backend does not have: listed, not hidden. */
  #missingInBackend(pairs: ReadonlyArray<Pair>): Promise<Array<Finding>> {
    const backend = new Set(pairs.map((pair) => pair.name))

    return Promise.resolve(
      Object.entries(shared)
        .filter(
          ([name, value]) =>
            name.endsWith('Validator') &&
            value instanceof shared.z.ZodType &&
            !this.#isGlobal(name) &&
            !this.#isClientData(name) &&
            !backend.has(name),
        )
        .map(([name]) =>
          this.#finding(
            'app/validators',
            'validator-without-pair',
            `\`${name}\` exists in \`@aporta/shared\` and has no VineJS pair in the backend`,
          ),
        ),
    )
  }

  /**
   * `Client*Validator` proves data that the client keeps in `localStorage` (layout of a table,
   * upload resume), under `shared/src/validators/client/`: no request reaches the backend, so
   * there is no pair to compare.
   */
  #isClientData(name: string): boolean {
    return name.startsWith('Client')
  }

  /** The globals (`IdentifierValidator`, `PaginationValidator`) live in `app/core/validator.ts`. */
  #isGlobal(name: string): boolean {
    return [
      'IdentifierValidator',
      'PaginationValidator',
      'TrashablePaginationValidator',
    ].includes(name)
  }

  #finding(file: string, rule: string, message: string): Finding {
    return { file, line: 1, rule, section: SECTION, message }
  }

  #report(findings: ReadonlyArray<Finding>, total: number): void {
    if (findings.length === 0) {
      process.stdout.write(
        `validators:check: ${total} validators, all with an equal pair.\n`,
      )
      return
    }

    process.stdout.write(`validators:check: ${findings.length} divergences\n\n`)
    process.stdout.write(`  _standards/architecture.md §${SECTION}\n`)
    for (const finding of findings) {
      process.stdout.write(
        `${`    ${finding.file}:${finding.line}  [${finding.rule}] ${finding.message}`}\n`,
      )
    }
    process.stdout.write('\n')
  }

  #same(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
    return left.length === right.length && left.every((v, i) => v === right[i])
  }

  #types(value: unknown): Array<string> {
    if (typeof value === 'string') return [value]
    return this.#array(value).map(String)
  }

  #array(value: unknown): Array<unknown> {
    if (Array.isArray(value)) return value
    return []
  }

  #isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  #field(value: unknown, key: string): unknown {
    if (!this.#isRecord(value)) return undefined
    return value[key]
  }
}

// Imported by the spec (`validators-check.unit.spec.ts`), the file only exposes the
// class; the check runs when it is the process.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await new ValidatorsCheck().run()
}
