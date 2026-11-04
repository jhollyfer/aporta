import * as z from 'zod'

import { ACTIVE_STATUSES } from './enums/active-status.js'
import type { ActiveStatus } from './enums/active-status.js'
import { LOCALE } from './enums/locale.js'
import type { Locale } from './enums/locale.js'
import { SORT_DIRECTIONS } from './enums/sort-direction.js'
import type { SortDirection } from './enums/sort-direction.js'
import { TRASHED_MODES } from './enums/trashed-mode.js'
import type { TrashedMode } from './enums/trashed-mode.js'

/**
 * The configured Zod, the rules that more than one resource uses, the rule messages
 * in pt-BR, es and en and the global validators (`_standards/architecture.md`
 * §9). Each resource's validators live in
 * `validators/<module>/<resource>.validator.ts` and import from here.
 *
 * The `z` comes re-exported from this module for the same reason as the frontend's former
 * `vine`: the configuration below (`z.config`) is global, and whoever reads a schema
 * from here has already loaded this file. Every resource validator imports `Rule` or
 * `z` from this module, so `z.config` runs before the first parse.
 */
export { z }

// ---------------------------------------------------------------------------
// Messages - one per rule, in the three languages
// ---------------------------------------------------------------------------

/**
 * The messages per rule, in pt-BR. The lookup goes from the most specific to the most
 * generic - `field.rule`, then `rule` -, like VineJS's provider did,
 * so the generic rule covers the common case and only what deviates gets its own
 * line.
 *
 * `{{ field }}` is replaced by the label from `FIELD_LABELS`, and only appears where
 * the sentence starts with a verb; in the other rules the name is omitted, because the error is
 * rendered under the already labeled field.
 */
const PT_BR_MESSAGES = {
  required: 'Informe {{ field }}',
  string: 'Informe {{ field }}',
  enum: 'Selecione {{ field }}',
  email: 'Informe um e-mail válido',
  number: 'Informe um número válido',
  boolean: 'Informe verdadeiro ou falso',
  array: 'Informe uma lista',
  object: 'Informe um objeto',
  richText: 'Informe um texto formatado válido',
  uuid: 'Selecione uma opção válida',
  minLength: 'Informe ao menos {{ min }} caracteres',
  maxLength: 'Informe no máximo {{ max }} caracteres',
  min: 'Informe um valor maior ou igual a {{ min }}',
  max: 'Informe um valor menor ou igual a {{ max }}',
  positive: 'Informe um valor maior que zero',
  withoutDecimals: 'Informe um número inteiro',
  'array.maxLength': 'Informe no máximo {{ max }} itens',
  // The four `.regex()`es of `Rule.password()` stop at the first that fails on the
  // same key, so the message lists the four requirements at once.
  'password.regex':
    'A senha precisa de letra minúscula, maiúscula, número e caractere especial',
  'password.minLength': 'A senha deve ter ao menos {{ min }} caracteres',
  'password.maxLength': 'A senha deve ter no máximo {{ max }} caracteres',
  // The refinement runs on the object and points at the confirmation, which is where the error
  // needs to appear.
  'passwordConfirmation.confirmed': 'As senhas não são iguais',
  // The label must not carry C0, DEL or C1 characters (CWE-150).
  'fileName.regex': 'O nome do arquivo não pode ter caracteres de controle',
} as const

type RuleMessages = Record<keyof typeof PT_BR_MESSAGES, string>

/**
 * Each language's messages. `satisfies` demands the same list of keys in all
 * three: a new rule in pt-BR without translation does not compile.
 */
export const RULE_MESSAGES = {
  'pt-BR': PT_BR_MESSAGES,
  es: {
    required: 'Ingrese {{ field }}',
    string: 'Ingrese {{ field }}',
    enum: 'Seleccione {{ field }}',
    email: 'Ingrese un correo electrónico válido',
    number: 'Ingrese un número válido',
    boolean: 'Ingrese verdadero o falso',
    array: 'Ingrese una lista',
    object: 'Ingrese un objeto',
    richText: 'Ingrese un texto con formato válido',
    uuid: 'Seleccione una opción válida',
    minLength: 'Ingrese al menos {{ min }} caracteres',
    maxLength: 'Ingrese como máximo {{ max }} caracteres',
    min: 'Ingrese un valor mayor o igual a {{ min }}',
    max: 'Ingrese un valor menor o igual a {{ max }}',
    positive: 'Ingrese un valor mayor que cero',
    withoutDecimals: 'Ingrese un número entero',
    'array.maxLength': 'Ingrese como máximo {{ max }} elementos',
    'password.regex':
      'La contraseña necesita minúscula, mayúscula, número y carácter especial',
    'password.minLength':
      'La contraseña debe tener al menos {{ min }} caracteres',
    'password.maxLength':
      'La contraseña debe tener como máximo {{ max }} caracteres',
    'passwordConfirmation.confirmed': 'Las contraseñas no coinciden',
    'fileName.regex':
      'El nombre del archivo no puede tener caracteres de control',
  },
  en: {
    required: 'Enter {{ field }}',
    string: 'Enter {{ field }}',
    enum: 'Select {{ field }}',
    email: 'Enter a valid email',
    number: 'Enter a valid number',
    boolean: 'Enter true or false',
    array: 'Enter a list',
    object: 'Enter an object',
    richText: 'Enter valid formatted text',
    uuid: 'Select a valid option',
    minLength: 'Enter at least {{ min }} characters',
    maxLength: 'Enter at most {{ max }} characters',
    min: 'Enter a value greater than or equal to {{ min }}',
    max: 'Enter a value less than or equal to {{ max }}',
    positive: 'Enter a value greater than zero',
    withoutDecimals: 'Enter a whole number',
    'array.maxLength': 'Enter at most {{ max }} items',
    'password.regex':
      'The password needs a lowercase letter, an uppercase letter, a number and a special character',
    'password.minLength':
      'The password must have at least {{ min }} characters',
    'password.maxLength': 'The password must have at most {{ max }} characters',
    'passwordConfirmation.confirmed': 'The passwords do not match',
    'fileName.regex': 'The file name cannot have control characters',
  },
} as const satisfies Record<Locale, RuleMessages>

/**
 * The friendly name of each field in pt-BR, in the form that fits well after
 * "Informe". A field outside the map appears with its raw name; `validator.test.ts`
 * walks the validators and demands the whole list.
 *
 * The key is the field path and nothing more: the message is global and does not know which
 * validator is running. The label swaps only the **displayed** text; the error
 * path remains the field name, and it is what the form uses to mark
 * the right input.
 */
const PT_BR_LABELS = {
  // Identity and account
  name: 'o nome',
  email: 'o e-mail',
  password: 'a senha',
  passwordConfirmation: 'a confirmação da senha',
  currentPassword: 'a senha atual',
  status: 'o status',
  avatarId: 'o avatar',
  id: 'o identificador',

  // File
  fileName: 'o nome do arquivo',
  mimetype: 'o tipo do arquivo',
  size: 'o tamanho',
  parts: 'as partes',
  partNumber: 'o número da parte',
  etag: 'o ETag',

  // Listing
  page: 'a página',
  perPage: 'o total por página',
  search: 'a busca',
  sort: 'a ordenação',
  direction: 'a direção da ordenação',
  trashed: 'o filtro de arquivados',

  // Listing (owner's ad)
  type: 'o tipo do imóvel',
  furnished: 'se o imóvel é mobiliado',
  neighborhood: 'o bairro',
  address: 'o endereço',
  monthly: 'o valor do aluguel por mês',
  daily: 'o valor da diária',
  water: 'se a água está inclusa',
  electricity: 'se a luz está inclusa',
  internet: 'se a internet está inclusa',
  periods: 'os períodos de aluguel',
  minimumStayMonths: 'o período mínimo em meses',
  title: 'o título do anúncio',
  description: 'a descrição',
  rules: 'as regras da casa',
  ownerName: 'o seu nome',
  whatsapp: 'o WhatsApp',
  bedrooms: 'o número de quartos',
  bathrooms: 'o número de banheiros',

  // Listing (owner's photos)
  photos: 'as fotos',
  photoId: 'a foto',
  photoIds: 'a ordem das fotos',
  storageId: 'o arquivo da foto',
  environment: 'o ambiente da foto',

  // Public storefront filters
  slug: 'o endereço do anúncio',
  period: 'o período de aluguel',
  minPrice: 'o valor mínimo',
  maxPrice: 'o valor máximo',
  minLng: 'a longitude mínima',
  minLat: 'a latitude mínima',
  maxLng: 'a longitude máxima',
  maxLat: 'a latitude máxima',
  category: 'a categoria',
  hours: 'o horário',
  date: 'a data',
  // Moderation and reports
  decision: 'a decisão',
  note: 'o motivo',
  verified: 'a verificação',
  role: 'o papel',
  reason: 'o motivo da denúncia',
  details: 'os detalhes',
  website: 'o site',
} as const

type FieldLabels = Record<keyof typeof PT_BR_LABELS, string>

export const FIELD_LABELS = {
  'pt-BR': PT_BR_LABELS,
  es: {
    name: 'el nombre',
    email: 'el correo electrónico',
    password: 'la contraseña',
    passwordConfirmation: 'la confirmación de la contraseña',
    currentPassword: 'la contraseña actual',
    status: 'el estado',
    avatarId: 'el avatar',
    id: 'el identificador',
    fileName: 'el nombre del archivo',
    mimetype: 'el tipo del archivo',
    size: 'el tamaño',
    parts: 'las partes',
    partNumber: 'el número de la parte',
    etag: 'el ETag',
    page: 'la página',
    perPage: 'el total por página',
    search: 'la búsqueda',
    sort: 'el orden',
    direction: 'la dirección del orden',
    trashed: 'el filtro de archivados',
    type: 'el tipo de inmueble',
    furnished: 'si el inmueble está amueblado',
    neighborhood: 'el barrio',
    address: 'la dirección',
    monthly: 'el valor del alquiler por mes',
    daily: 'el valor por día',
    water: 'si el agua está incluida',
    electricity: 'si la luz está incluida',
    internet: 'si el internet está incluido',
    periods: 'los períodos de alquiler',
    minimumStayMonths: 'el período mínimo en meses',
    title: 'el título del anuncio',
    description: 'la descripción',
    rules: 'las reglas de la casa',
    ownerName: 'su nombre',
    whatsapp: 'el WhatsApp',
    bedrooms: 'el número de dormitorios',
    bathrooms: 'el número de baños',
    photos: 'las fotos',
    photoId: 'la foto',
    photoIds: 'el orden de las fotos',
    storageId: 'el archivo de la foto',
    environment: 'el ambiente de la foto',
    slug: 'la dirección del anuncio',
    period: 'el período de alquiler',
    minPrice: 'el valor mínimo',
    maxPrice: 'el valor máximo',
    minLng: 'la longitud mínima',
    minLat: 'la latitud mínima',
    maxLng: 'la longitud máxima',
    maxLat: 'la latitud máxima',
    category: 'la categoría',
    hours: 'el horario',
    date: 'la fecha',
    decision: 'la decisión',
    note: 'el motivo',
    verified: 'la verificación',
    role: 'el rol',
    reason: 'el motivo de la denuncia',
    details: 'los detalles',
    website: 'el sitio',
  },
  en: {
    name: 'the name',
    email: 'the email',
    password: 'the password',
    passwordConfirmation: 'the password confirmation',
    currentPassword: 'the current password',
    status: 'the status',
    avatarId: 'the avatar',
    id: 'the identifier',
    fileName: 'the file name',
    mimetype: 'the file type',
    size: 'the size',
    parts: 'the parts',
    partNumber: 'the part number',
    etag: 'the ETag',
    page: 'the page',
    perPage: 'the page size',
    search: 'the search',
    sort: 'the sort order',
    direction: 'the sort direction',
    trashed: 'the archived filter',
    type: 'the property type',
    furnished: 'whether the property is furnished',
    neighborhood: 'the neighborhood',
    address: 'the address',
    monthly: 'the monthly rent',
    daily: 'the daily rate',
    water: 'whether water is included',
    electricity: 'whether electricity is included',
    internet: 'whether internet is included',
    periods: 'the rental periods',
    minimumStayMonths: 'the minimum stay in months',
    title: 'the listing title',
    description: 'the description',
    rules: 'the house rules',
    ownerName: 'your name',
    whatsapp: 'the WhatsApp number',
    bedrooms: 'the number of bedrooms',
    bathrooms: 'the number of bathrooms',
    photos: 'the photos',
    photoId: 'the photo',
    photoIds: 'the photo order',
    storageId: 'the photo file',
    environment: 'the photo environment',
    slug: 'the listing address',
    period: 'the rental period',
    minPrice: 'the minimum price',
    maxPrice: 'the maximum price',
    minLng: 'the minimum longitude',
    minLat: 'the minimum latitude',
    maxLng: 'the maximum longitude',
    maxLat: 'the maximum latitude',
    category: 'the category',
    hours: 'the opening hours',
    date: 'the date',
    decision: 'the decision',
    note: 'the reason',
    verified: 'the verification',
    role: 'the role',
    reason: 'the report reason',
    details: 'the details',
    website: 'the website',
  },
} as const satisfies Record<Locale, FieldLabels>

/**
 * Zod's locale for each language: it is the fallback for what `RULE_MESSAGES` does not
 * cover (unknown key, invalid union), in the docs' order of precedence -
 * global message (`customError`) first, locale after
 * (_doc-lib/zod.md#error-customization, https://zod.dev/error-customization).
 */
const ZOD_LOCALES = {
  'pt-BR': z.locales.ptBR,
  es: z.locales.es,
  en: z.locales.en,
} satisfies Record<Locale, () => { localeError: z.core.$ZodErrorMap }>

/**
 * The translation of a Zod issue into the house message.
 *
 * It lives in a class because it holds the active language, which is module state. The
 * language starts as pt-BR; the browser switches it with `ValidationMessage.setLocale(getLocale())`
 * (`frontend/src/router.tsx`), and the server keeps pt-BR because the state is shared by
 * parallel requests.
 */
export class ValidationMessage {
  private static locale: Locale = LOCALE.PT_BR

  /** Switches the messages' language and Zod's fallback locale. */
  static setLocale(locale: Locale): void {
    ValidationMessage.locale = locale
    z.config(ZOD_LOCALES[locale]())
  }

  /**
   * The issue's message, or `undefined` to yield to Zod's locale -
   * the `customError` contract (_doc-lib/zod.md#error-customization).
   */
  static resolve(issue: z.core.$ZodRawIssue): string | undefined {
    const rule = ValidationMessage.rule(issue)
    if (!rule) return undefined

    const field = ValidationMessage.field(issue.path)
    const messages: Readonly<Record<string, string>> =
      RULE_MESSAGES[ValidationMessage.locale]
    // From specific to generic, like VineJS's provider: the chain is the
    // rule, and not a fallback that hides a missing key.
    const template = messages[`${field}.${rule}`] ?? messages[rule]
    if (!template) return undefined

    const labels: Readonly<Record<string, string>> =
      FIELD_LABELS[ValidationMessage.locale]
    const values: Readonly<Record<string, string>> = {
      field: labels[field] ?? field,
      min: String(ValidationMessage.bound(issue, 'minimum')),
      max: String(ValidationMessage.bound(issue, 'maximum')),
    }

    return template.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (_match, key: string) => values[key] ?? '',
    )
  }

  /** The `RULE_MESSAGES` rule that the issue represents. */
  private static rule(issue: z.core.$ZodRawIssue): string | undefined {
    // An empty field is "required", whatever the rule that failed it: it is the
    // reading of the backend bodyparser's `convertEmptyStringsToNull`, where
    // `''` becomes `null` before validating.
    if (issue.input === undefined || issue.input === null) return 'required'
    if (issue.input === '') return 'required'

    switch (issue.code) {
      case 'invalid_type':
        if (issue.expected === 'int') return 'withoutDecimals'
        return issue.expected
      case 'too_small':
        return ValidationMessage.tooSmall(issue.origin, issue)
      case 'too_big':
        if (issue.origin === 'string') return 'maxLength'
        if (issue.origin === 'array') return 'array.maxLength'
        return 'max'
      case 'invalid_format':
        return issue.format
      case 'invalid_value':
        return 'enum'
      case 'custom':
        return ValidationMessage.customRule(issue.params)
      default:
        return undefined
    }
  }

  private static tooSmall(
    origin: string,
    issue: { readonly minimum: number | bigint; readonly inclusive?: boolean },
  ): string {
    if (origin === 'string') return 'minLength'
    if (origin === 'array') return 'array.minLength'
    if (issue.minimum === 0 && issue.inclusive === false) return 'positive'
    return 'min'
  }

  /** The house refinement names the rule in `params.rule`. */
  private static customRule(
    params: Readonly<Record<string, unknown>> | undefined,
  ): string | undefined {
    const rule = params?.rule
    if (typeof rule !== 'string') return undefined
    return rule
  }

  /** The last text segment of the path: `tags[0]` is `tags`. */
  private static field(path: ReadonlyArray<PropertyKey> | undefined): string {
    const segment = path?.filter((each) => typeof each === 'string').at(-1)
    if (typeof segment !== 'string') return ''
    return segment
  }

  private static bound(
    issue: z.core.$ZodRawIssue,
    key: 'minimum' | 'maximum',
  ): unknown {
    if (!(key in issue)) return ''
    return Reflect.get(issue, key)
  }
}

z.config(ZOD_LOCALES[LOCALE.PT_BR]())
z.config({ customError: (issue) => ValidationMessage.resolve(issue) })

// ---------------------------------------------------------------------------
// Shared rules
// ---------------------------------------------------------------------------

/** The Postgres `integer` ceiling: above it the column overflows and becomes a 500. */
export const INTEGER_MAX = 2_147_483_647

/**
 * A mark of the editor's JSON (`bold`, `link`...). Only the shape is checked here; which marks
 * exist is the extension list of `rich-text-schema.ts`, checked by the server.
 */
const RichTextMarkSchema = z.object({
  type: z.string(),
  attrs: z.record(z.string(), z.unknown()).optional(),
})

/** A node of the editor's JSON (ProseMirror): `type`, and what each kind of node may carry. */
export type RichTextNode = {
  type: string
  attrs?: Record<string, unknown> | undefined
  content?: Array<RichTextNode> | undefined
  marks?:
    | Array<{ type: string; attrs?: Record<string, unknown> | undefined }>
    | undefined
  text?: string | undefined
}

const RichTextNodeSchema: z.ZodType<RichTextNode, RichTextNode> = z
  .lazy(() =>
    z.object({
      type: z.string(),
      attrs: z.record(z.string(), z.unknown()).optional(),
      content: z.array(RichTextNodeSchema).optional(),
      marks: z.array(RichTextMarkSchema).optional(),
      text: z.string().optional(),
    }),
  )
  .meta({ id: 'RichTextNode' })

/**
 * The ceiling of the rich text, in characters of its serialized JSON. Editorial, like the 50
 * thousand characters the Markdown column had: the JSON carries the same text plus its structure.
 */
export const RICH_TEXT_MAX_LENGTH = 200_000

/**
 * The document the editor writes (`editor.getJSON()`): the shape of the Tiptap JSON, stored in a
 * `jsonb` column and read by the static renderer (`_standards/frontend.md` §8). Which nodes and
 * marks are allowed is `RICH_TEXT_EXTENSIONS` (`rich-text-schema.ts`); the server checks it.
 */
export const RichTextDocumentSchema = z
  .object({
    type: z.literal('doc'),
    content: z.array(RichTextNodeSchema).optional(),
  })
  .meta({ id: 'RichTextDocument' })

export type RichTextDocument = z.infer<typeof RichTextDocumentSchema>

const BOUNDS_KEYS = ['minLng', 'minLat', 'maxLng', 'maxLat'] as const

type BoundsPayload = Partial<Record<(typeof BOUNDS_KEYS)[number], number>>

/**
 * What `Rule.optional` returns: the field that may be missing, and for which `''` means missing
 * (the bodyparser's `convertEmptyStringsToNull` does the same on the API).
 */
type BlankableField<T extends z.ZodType> = z.ZodOptional<
  z.ZodPreprocess<z.ZodOptional<T>, z.input<T> | undefined>
>

/** What `Rule.nullable` returns: like `BlankableField`, and `''` becomes an explicit `null`. */
type NullableField<T extends z.ZodType> = z.ZodOptional<
  z.ZodPreprocess<z.ZodNullable<T>, z.input<T> | null | undefined>
>

/** The two fields that `Rule.confirmed()` compares. */
type PasswordPair = {
  readonly password?: string | undefined
  readonly passwordConfirmation?: string | undefined
}

/**
 * The rules that more than one resource uses (`_standards/typescript.md` §6).
 *
 * They are methods, not constants: reusing the same schema node in two
 * validators would share the node between them, and each call returns a new one.
 */
export class Rule {
  /** Whole string without a control character; the source of truth of both validator sides. */
  static readonly NO_CONTROL_CHARACTERS = /^\P{Cc}*$/u

  /**
   * An optional field with the backend's semantics: `''` counts as absent, as the
   * bodyparser's `convertEmptyStringsToNull` does before VineJS's `.optional()`.
   * Without this an optional email left blank would be refused as an invalid
   * email, and the API would accept it.
   *
   * The preprocessor's parameter is annotated so the schema's input stays
   * typed (`z.input`), which is where the `zodResolver` takes the form type from
   * (_doc-lib/zod.md#api, https://zod.dev/api#preprocess).
   */
  static optional<T extends z.ZodType>(schema: T): BlankableField<T> {
    return z
      .preprocess(
        (value: z.input<T> | undefined) => Rule.blankAs(value, undefined),
        schema.optional(),
      )
      .optional()
  }

  /**
   * A field that accepts an explicit `null` (removing the cover without replacing it) and may be missing
   * (do not touch). `''` becomes `null`, as in the bodyparser.
   */
  static nullable<T extends z.ZodType>(schema: T): NullableField<T> {
    return z
      .preprocess(
        (value: z.input<T> | null | undefined) => Rule.blankAs(value, null),
        schema.nullable(),
      )
      .optional()
  }

  /**
   * A key-to-value map in which an invalid entry vanishes, instead of failing
   * the whole map. It is for outside data that the product can discard without warning
   * (a layout saved in `localStorage`): a corrupted width cannot erase the
   * user's other columns.
   */
  static lenientRecord<T extends z.ZodType>(
    item: T,
  ): z.ZodPipe<
    z.ZodRecord<z.ZodString, z.ZodUnknown>,
    z.ZodTransform<Record<string, z.output<T>>, Record<string, unknown>>
  > {
    return z.record(z.string(), z.unknown()).transform((entries) => {
      const kept: Record<string, z.output<T>> = {}

      for (const [key, value] of Object.entries(entries)) {
        const parsed = item.safeParse(value)
        if (parsed.success) kept[key] = parsed.data
      }

      return kept
    })
  }

  /**
   * The date as the API exchanges it: `YYYY-MM-DD`, the text that the `DatePicker`
   * keeps and that the body carries. The 40-character ceiling keeps the field from becoming
   * free text; the real format is checked on the server.
   */
  static wireDate(): z.ZodString {
    return z.string().trim().min(1).max(40)
  }

  /**
   * The editor's JSON document, within the editorial ceiling. The content of the nodes is the
   * server's to check (it holds the extension list); here the form refuses what is not a
   * document or is too big, with the same `richText` message the API answers.
   */
  static richText(): typeof RichTextDocumentSchema {
    return RichTextDocumentSchema.refine(
      (document) => JSON.stringify(document).length <= RICH_TEXT_MAX_LENGTH,
      { params: { rule: 'richText' } },
    )
  }

  static email(): z.ZodEmail {
    return z.email().max(254)
  }

  /**
   * The label of an uploaded file: no control characters (Unicode `Cc`: C0, DEL and C1).
   * The name is client input that later reaches terminals and logs, where an escape
   * sequence is obeyed instead of shown (CWE-150). The backend pair is `fileName()`.
   */
  static fileName(): z.ZodString {
    return z.string().trim().min(1).max(255).regex(Rule.NO_CONTROL_CHARACTERS)
  }

  /**
   * Password strength: one `regex` per character class. The confirmation does not live
   * here: it is a rule between two fields, and goes on the object through `Rule.confirmed()`.
   */
  static password(): z.ZodString {
    return z
      .string()
      .min(8)
      .max(32)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^a-zA-Z0-9]/)
  }

  /**
   * `passwordConfirmation` equal to `password`, with the error pointed at the
   * confirmation, which is where the message needs to appear (`path`). `when` makes the
   * refinement run even with another field invalid, as long as the two
   * password fields are well formed (_doc-lib/zod.md#api, https://zod.dev/api#when).
   */
  static confirmed(): [
    check: (payload: PasswordPair) => boolean,
    params: {
      path: Array<PropertyKey>
      params: { rule: string }
      when: (payload: z.core.ParsePayload) => boolean
    },
  ] {
    return [
      (payload) => payload.password === payload.passwordConfirmation,
      {
        path: ['passwordConfirmation'],
        params: { rule: 'confirmed' },
        when: (payload: z.core.ParsePayload) =>
          payload.issues.every(
            (issue) =>
              issue.path?.[0] !== 'password' &&
              issue.path?.[0] !== 'passwordConfirmation',
          ),
      },
    ]
  }

  static activeStatus(): z.ZodEnum<{ [K in ActiveStatus]: K }> {
    return z.enum(ACTIVE_STATUSES)
  }

  /** The three fields that every listing accepts. The `perPage` ceiling lives here. */
  static paginationFields(): {
    page: BlankableField<z.ZodNumber>
    perPage: BlankableField<z.ZodNumber>
    search: BlankableField<z.ZodString>
  } {
    return {
      page: Rule.optional(z.number().min(1)),
      perPage: Rule.optional(z.number().min(1).max(100)),
      search: Rule.optional(z.string().max(100)),
    }
  }

  /**
   * The map window as four numbers (`minLng`, `minLat`, `maxLng`, `maxLat`), in decimal degrees.
   * Four fields and not one `bbox=a,b,c,d` text: each number is validated on its own (a latitude
   * above 90 points at `maxLat`), and the query string needs no parser of its own on either side.
   * They only mean something together, which `Rule.boundsComplete()` enforces.
   */
  static boundsFields(): {
    minLng: BlankableField<z.ZodNumber>
    minLat: BlankableField<z.ZodNumber>
    maxLng: BlankableField<z.ZodNumber>
    maxLat: BlankableField<z.ZodNumber>
  } {
    return {
      minLng: Rule.optional(z.number().min(-180).max(180)),
      minLat: Rule.optional(z.number().min(-90).max(90)),
      maxLng: Rule.optional(z.number().min(-180).max(180)),
      maxLat: Rule.optional(z.number().min(-90).max(90)),
    }
  }

  /**
   * The window is all or nothing: three corners of a rectangle select nothing sensible, and
   * silently ignoring them would show the whole city on a map the visitor thought was zoomed in.
   * The backend's `requiredIfAnyExists` on each bound, pointed at the one that is missing
   * (`refine` takes a single `path`, so the error always points at `minLng`).
   */
  static boundsComplete(): [
    check: (payload: BoundsPayload) => boolean,
    params: { path: Array<PropertyKey>; params: { rule: string } },
  ] {
    return [
      (payload) => {
        const given = BOUNDS_KEYS.filter((key) => payload[key] !== undefined)
        return given.length === 0 || given.length === BOUNDS_KEYS.length
      },
      { path: ['minLng'], params: { rule: 'required' } },
    ]
  }

  /**
   * The trash slice, only for the listings that have something to restore. Outside
   * `paginationFields()` on purpose: the storefront never sees archived records.
   */
  static trashedField(): {
    trashed: BlankableField<z.ZodEnum<{ [K in TrashedMode]: K }>>
  } {
    return { trashed: Rule.optional(z.enum(TRASHED_MODES)) }
  }

  /**
   * A listing's order in two fields: `sort` (the column, from a list
   * closed per resource) and `direction`. A pair, and not an `order-<column>` per
   * column: two order parameters do not express precedence.
   */
  static sortFields<const TColumns extends readonly [string, ...Array<string>]>(
    columns: TColumns,
  ): {
    sort: BlankableField<z.ZodEnum<{ [K in TColumns[number]]: K }>>
    direction: BlankableField<z.ZodEnum<{ [K in SortDirection]: K }>>
  } {
    return {
      sort: Rule.optional(z.enum(columns)),
      direction: Rule.optional(z.enum(SORT_DIRECTIONS)),
    }
  }

  private static blankAs<TValue, TBlank extends null | undefined>(
    value: TValue,
    blank: TBlank,
  ): TValue | TBlank {
    if (value === '') return blank
    return value
  }
}

// ---------------------------------------------------------------------------
// Global validators
// ---------------------------------------------------------------------------

/** The identifier in the URL. The PK is a uuid in every table. */
export const IdentifierValidator = z.object({ id: z.uuid() })

export const PaginationValidator = z.object(Rule.paginationFields())

/**
 * The pagination of resources that have a trash: the `PaginationValidator` plus
 * `trashed`. A schema of its own because the storefront listings stay without it.
 */
export const TrashablePaginationValidator = z.object({
  ...Rule.paginationFields(),
  ...Rule.trashedField(),
})

export type IdentifierPayload = z.infer<typeof IdentifierValidator>
export type PaginationPayload = z.infer<typeof PaginationValidator>
export type TrashablePaginationPayload = z.infer<
  typeof TrashablePaginationValidator
>
