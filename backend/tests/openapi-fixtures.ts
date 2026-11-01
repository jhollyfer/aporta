import { readFile } from 'node:fs/promises'

import app from '@adonisjs/core/services/app'

import { vine, type Infer } from '#core/validator'

/**
 * The part of `openapi.json` that the specs read. The file is data from outside the
 * process: it enters as `unknown` and goes through the validator before gaining a type
 * (`typescript.md` §2).
 */
const OpenapiDocumentValidator = vine.create({
  openapi: vine.string(),
  servers: vine.array(
    vine.object({ url: vine.string() }).allowUnknownProperties(),
  ),
  paths: vine.record(
    vine.record(
      vine
        .object({
          operationId: vine.string(),
          responses: vine.record(vine.any()),
        })
        .allowUnknownProperties(),
    ),
  ),
})

/** A validator with a `vine.date()`, the case the OpenAPI converter has to patch. */
export const DatedValidator = vine.create({ day: vine.date() })

export type OpenapiDocument = Infer<typeof OpenapiDocumentValidator>

/** The committed document, read and validated. */
export async function readOpenapiDocument(): Promise<OpenapiDocument> {
  const raw: unknown = JSON.parse(
    await readFile(app.makePath('openapi.json'), 'utf-8'),
  )

  return OpenapiDocumentValidator.validate(raw)
}
