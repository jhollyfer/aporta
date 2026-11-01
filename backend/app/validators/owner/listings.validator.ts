import { LISTING_PERIODS, LISTING_TYPES } from '@aporta/shared'

import { vine } from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * What the owner sends to publish a listing. The VineJS pair of the Zod
 * `OwnerListingCreateValidator` in `@aporta/shared`: the form validates with that one and
 * the API with this one, and `validators:check` fails the day the two diverge.
 *
 * The ceilings are the same on both sides, and they exist for a reason: free text without a
 * ceiling is how a 1 MB description reaches the database, and a price with an extra zero is
 * the commonest error in a rent field (`100_000` is the bound that catches the worst of it).
 *
 * That the neighborhood exists is the use-case's to check through the repository (404); the
 * validator only guarantees the shape.
 */
export const OwnerListingCreateValidator = vine.create({
  type: vine.enum(LISTING_TYPES),
  furnished: vine.boolean({ strict: true }),
  neighborhood: vine.string().trim().minLength(1).maxLength(60),
  address: vine.string().trim().minLength(5).maxLength(120),
  monthly: vine.number().withoutDecimals().min(1).max(100_000),
  daily: vine.number().withoutDecimals().min(1).max(10_000).optional(),
  water: vine.boolean({ strict: true }),
  electricity: vine.boolean({ strict: true }),
  internet: vine.boolean({ strict: true }),
  periods: vine.array(vine.enum(LISTING_PERIODS)).minLength(1).maxLength(4),
  minimumStayMonths: vine.number().withoutDecimals().min(1).max(36),
  title: vine.string().trim().minLength(8).maxLength(80),
  description: vine.string().trim().minLength(20).maxLength(600),
  rules: vine.string().trim().maxLength(600),
  ownerName: vine.string().trim().minLength(2).maxLength(60),
  whatsapp: vine.string().trim().minLength(10).maxLength(13),
})

export type OwnerListingCreatePayload = Infer<
  typeof OwnerListingCreateValidator
>
