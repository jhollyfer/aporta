import {
  LISTING_PERIODS,
  LISTING_SORT_COLUMNS,
  LISTING_STATUSES,
  LISTING_TYPES,
} from '@aporta/shared'

import { paginationFields, sortFields, vine } from '#core/validator'
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
  rules: vine.string().trim().maxLength(600).optional(),
  ownerName: vine.string().trim().minLength(2).maxLength(60),
  whatsapp: vine.string().trim().minLength(10).maxLength(13),
  bedrooms: vine.number().withoutDecimals().min(0).max(20).optional(),
  bathrooms: vine.number().withoutDecimals().min(0).max(20).optional(),
})

/**
 * What the owner changes in an ad. The VineJS pair of the Zod `OwnerListingUpdateValidator`.
 * Every field is optional: an absent one means "do not touch". The ceilings are the creation's,
 * and the entity checks the invariants again on the result, since a partial payload can still
 * leave the ad without a price.
 *
 * It declares no `status`, `slug` or owner: VineJS drops what the schema does not name, so the
 * body cannot publish the ad, move its address or hand it to another account.
 */
export const OwnerListingUpdateValidator = vine.create({
  type: vine.enum(LISTING_TYPES).optional(),
  furnished: vine.boolean({ strict: true }).optional(),
  neighborhood: vine.string().trim().minLength(1).maxLength(60).optional(),
  address: vine.string().trim().minLength(5).maxLength(120).optional(),
  monthly: vine.number().withoutDecimals().min(1).max(100_000).optional(),
  daily: vine.number().withoutDecimals().min(1).max(10_000).optional(),
  water: vine.boolean({ strict: true }).optional(),
  electricity: vine.boolean({ strict: true }).optional(),
  internet: vine.boolean({ strict: true }).optional(),
  periods: vine
    .array(vine.enum(LISTING_PERIODS))
    .minLength(1)
    .maxLength(4)
    .optional(),
  minimumStayMonths: vine.number().withoutDecimals().min(1).max(36).optional(),
  title: vine.string().trim().minLength(8).maxLength(80).optional(),
  description: vine.string().trim().minLength(20).maxLength(600).optional(),
  rules: vine.string().trim().maxLength(600).optional(),
  ownerName: vine.string().trim().minLength(2).maxLength(60).optional(),
  whatsapp: vine.string().trim().minLength(10).maxLength(13).optional(),
  bedrooms: vine.number().withoutDecimals().min(0).max(20).optional(),
  bathrooms: vine.number().withoutDecimals().min(0).max(20).optional(),
})

/**
 * What `GET /owner/listings` accepts in the query: the owner's own ads, by state if he wants.
 * The VineJS pair of the Zod `OwnerListingPaginateValidator`. No owner parameter: the scope is the
 * session, so there is nothing to forge.
 */
export const OwnerListingPaginateValidator = vine.create({
  ...paginationFields(),
  status: vine.enum(LISTING_STATUSES).optional(),
  ...sortFields(LISTING_SORT_COLUMNS),
})

export type OwnerListingCreatePayload = Infer<
  typeof OwnerListingCreateValidator
>
export type OwnerListingUpdatePayload = Infer<
  typeof OwnerListingUpdateValidator
>
export type OwnerListingPaginatePayload = Infer<
  typeof OwnerListingPaginateValidator
>
