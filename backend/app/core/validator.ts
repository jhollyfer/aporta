import { HttpContext } from '@adonisjs/core/http'
import type { I18nManager } from '@adonisjs/i18n'
import {
  ACTIVE_STATUSES,
  Rule,
  RichText,
  SORT_DIRECTIONS,
  TRASHED_MODES,
} from '@aporta/shared'
import vine, { SimpleMessagesProvider, VineDate, errors } from '@vinejs/vine'
import type {
  FieldContext,
  Infer,
  MessagesProviderContact,
} from '@vinejs/vine/types'
import { DateTime } from 'luxon'

/**
 * The application's configured VineJS, and what every validator shares.
 *
 * Each resource has its `<resource>.validator.ts` in the resource folder
 * (`_standards/architecture.md` §3); only what belongs to all lives here: the `vine` with the
 * date transform and the translated messages, the rules used by more than one
 * resource (functions, not constants) and the global validators for
 * identifier and pagination. Nobody imports `@vinejs/vine` directly: it is through this
 * module that the house messages and rules hold in every schema.
 *
 * The OpenAPI generator resolves validators through the controllers' AST, reading
 * the import specifier and re-importing the module. Renaming an export without
 * updating the controller does not break the build: the operation silently vanishes from the document,
 * and `node ace openapi:generate --check` is what catches it.
 */

export { vine, errors }
export type { Infer }

declare module '@vinejs/vine/types' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- declaration merging requires `interface`
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/*
|--------------------------------------------------------------------------
| Validation messages
|--------------------------------------------------------------------------
|
| The text of each rule and the name of each field live in
| `resources/lang/{pt-BR,es,en}/validator.json` (`shared.messages` and
| `shared.fields`), in ICU format: `{ field }`, `{ min }`, `{ max }`. Without it
| VineJS answers with its English default, and the 422 comes out bilingual: the envelope of
| `app/exceptions/handler.ts` is translated and the values of `errors` would not be.
|
| Two traps, if you touch this:
|
| - `shared.fields` swaps only the **displayed** `{ field }`. The error key remains
|   the field name (`avatarId`), and it is what the frontend uses to mark
|   the right input. Renaming the key breaks the form.
| - Do not configure `vine.errorReporter`. The handler depends on the array format
|   `{ field, rule, message }` of `SimpleErrorReporter`.
|
*/

/**
 * The messages provider VineJS uses in every `validate()`.
 *
 * **Why a global provider and not the guide's `RequestValidator.messagesProvider`.**
 * That hook only applies to `request.validateUsing()`, and a direct
 * `Validator.validate(data)` (ace command, seeder, test) would go untranslated.
 * `vine.create()` also captures the provider at the moment the
 * validator is created, so it must be a stable object. This object picks the
 * language on each call: the `ctx.i18n` of the request in progress (via
 * `HttpContext.get()`, which requires `useAsyncLocalStorage` in `config/app.ts`) and,
 * outside HTTP (ace command, seeder), the default language, pt-BR.
 * (_doc-lib/adonisjs.md#guides/digging-deeper/i18n, section "Using translations
 * with VineJS directly": https://docs.adonisjs.com/guides/digging-deeper/i18n;
 * https://docs.adonisjs.com/guides/concepts/async-local-storage)
 *
 * `I18nManager` comes in through `bind()` in `start/validator.ts`, not through
 * import: the `@adonisjs/i18n/services/main` service requires the application to be up, and
 * this module is also loaded by scripts that do not boot it (`validators:check`).
 */
export class RequestMessagesProvider implements MessagesProviderContact {
  readonly #english = new SimpleMessagesProvider({})
  #manager: I18nManager | undefined

  bind(manager: I18nManager) {
    this.#manager = manager
  }

  getMessage(
    rawMessage: string,
    rule: string,
    field: FieldContext,
    args?: Record<string, unknown>,
  ) {
    const i18n =
      HttpContext.get()?.i18n ??
      this.#manager?.locale(this.#manager.defaultLocale)

    // Without i18n (module loaded outside boot): VineJS's English default.
    if (!i18n) {
      return this.#english.getMessage(rawMessage, rule, field, args)
    }

    return i18n
      .createMessagesProvider()
      .getMessage(rawMessage, rule, field, args)
  }
}

export const requestMessagesProvider = new RequestMessagesProvider()

vine.messagesProvider = requestMessagesProvider

// ---------------------------------------------------------------------------
// Shared rules
// ---------------------------------------------------------------------------

/**
 * Rules reused by more than one resource.
 *
 * They are functions, not constants: reusing the same schema node in two
 * validators would share options between them - the `optional()` of one
 * would show up in the other.
 */

export function email() {
  return vine.string().trim().email().maxLength(254)
}

/**
 * The label of an uploaded file: no control characters (the pair of `Rule.fileName()`
 * in `@aporta/shared`, which holds the pattern). The name is client input that later
 * reaches terminals and logs (CWE-150).
 */
export function fileName() {
  return vine
    .string()
    .trim()
    .minLength(1)
    .maxLength(255)
    .regex(Rule.NO_CONTROL_CHARACTERS)
}

/**
 * Password strength: one `regex` per character class, so the message points at
 * exactly what is missing instead of a "weak password" that does not say what to do.
 *
 * `confirmed` requires `passwordConfirmation` with the same value, read from the raw
 * input. No schema here declares it, and that alone is why it does not show up in the
 * validated payload - there is nothing to discard before `merge()`/`create()` in the
 * use-case. What VineJS delivers is what the schema declares.
 */
export function password() {
  return vine
    .string()
    .minLength(8)
    .maxLength(32)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/[0-9]/)
    .regex(/[^a-zA-Z0-9]/)
    .confirmed({ as: 'passwordConfirmation' })
}

/**
 * The rich text document the editor writes, as the API receives it (the pair of
 * `Rule.richText()` in `@aporta/shared`).
 *
 * The object declares only what every document has (`type: 'doc'`, `content`), and the rule
 * hands the whole value to `RichText.violation`, which holds the extension list: a node or
 * mark that no extension declares, a link that is not `http(s)`/`mailto`, a document with no
 * text or above the ceiling is a field error here, never a stored row.
 */
export function richText() {
  return vine
    .object({
      type: vine.literal('doc'),
      content: vine.array(vine.any()).optional(),
    })
    .allowUnknownProperties()
    .use(richTextRule())
}

const richTextRule = vine.createRule((value, _options, field) => {
  const violation = RichText.violation(value)

  if (violation) field.report(`The {{ field }} is invalid`, violation, field)
})

/**
 * Account status. Canonical in English: the value is an identifier, and the Portuguese
 * label belongs to the frontend.
 */
export function activeStatus() {
  return vine.enum(ACTIVE_STATUSES)
}

/**
 * The three fields every listing accepts. Spread
 * (`...paginationFields()`) by validators that still add a filter
 * of their own, so the `perPage` ceiling lives in one place - repeated by hand in
 * each resource, it is a divergence waiting to happen.
 */
export function paginationFields() {
  return {
    page: vine.number().min(1).optional(),
    perPage: vine.number().min(1).max(100).optional(),
    search: vine.string().maxLength(100).optional(),
  }
}

/**
 * The map window as four numbers, in decimal degrees: `minLng`, `minLat`, `maxLng`, `maxLat`.
 * The pair of `Rule.boundsFields()` in `@aporta/shared`.
 *
 * Four fields and not one `bbox=a,b,c,d` text: each number is validated on its own, and the
 * `422` points at the one that is wrong. They only mean something together, so each one is
 * `requiredIfAnyExists` the other three: three corners of a rectangle select nothing sensible,
 * and ignoring them quietly would draw the whole city on a map the visitor thought was zoomed in.
 */
export function boundsFields() {
  return {
    minLng: vine
      .number()
      .min(-180)
      .max(180)
      .optional()
      .requiredIfAnyExists(['minLat', 'maxLng', 'maxLat']),
    minLat: vine
      .number()
      .min(-90)
      .max(90)
      .optional()
      .requiredIfAnyExists(['minLng', 'maxLng', 'maxLat']),
    maxLng: vine
      .number()
      .min(-180)
      .max(180)
      .optional()
      .requiredIfAnyExists(['minLng', 'minLat', 'maxLat']),
    maxLat: vine
      .number()
      .min(-90)
      .max(90)
      .optional()
      .requiredIfAnyExists(['minLng', 'minLat', 'maxLng']),
  }
}

/**
 * The trash cut, for listings that have something to restore.
 *
 * Outside `paginationFields()` on purpose: if it were there, it would also show up
 * in the public listings, which never see an archived record. The parameter
 * would be accepted, silently ignored, and the OpenAPI document would start promising
 * a filter that does not exist.
 */
export function trashedField() {
  return { trashed: vine.enum(TRASHED_MODES).optional() }
}

/**
 * The order of a listing, in two fields: `sort` (the column) and `direction`.
 *
 * **A pair, and not an `order-<column>` per column.** Two order parameters at the
 * same time do not express precedence - `?order-title=asc&order-date=desc`
 * does not say which wins -, and the query orders by a single column.
 *
 * **The column comes from a closed list, declared per resource.** The value goes
 * straight into `orderBy`, which composes it into SQL: accepting free text from the URL would be
 * handing the clause to the client. A column outside the list is a 422 pointing at the field,
 * not a database 500 complaining about a nonexistent column.
 *
 * Outside `paginationFields()` for the same reason as `trashedField()`: each
 * resource orders by what it has, and a global set would promise in OpenAPI
 * columns that half the listings do not know.
 */
export function sortFields<
  const TColumns extends readonly [string, ...string[]],
>(columns: TColumns) {
  return {
    sort: vine.enum(columns).optional(),
    direction: vine.enum(SORT_DIRECTIONS).optional(),
  }
}

// ---------------------------------------------------------------------------
// Global validators
// ---------------------------------------------------------------------------

/**
 * The identifier in the URL. Holds for every resource: the PK is a uuid in every table.
 *
 * It exists so a malformed `:id` is a 422 pointing at the field, not a Postgres 500
 * refusing the literal in the `where` clause.
 */
export const IdentifierValidator = vine.create({
  id: vine.string().uuid(),
})

export const PaginationValidator = vine.create(vine.object(paginationFields()))

/**
 * Pagination for resources that have a trash. It is the `PaginationValidator` plus
 * `trashed`, and exists as its own schema because the public listings
 * remain without it.
 */
export const TrashablePaginationValidator = vine.create({
  ...paginationFields(),
  ...trashedField(),
})

export type IdentifierPayload = Infer<typeof IdentifierValidator>

export type PaginationPayload = Infer<typeof PaginationValidator>

export type TrashablePaginationPayload = Infer<
  typeof TrashablePaginationValidator
>
