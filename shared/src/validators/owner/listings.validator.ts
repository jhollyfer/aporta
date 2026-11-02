import { LISTING_PERIOD } from '../../enums/listing-period.js'
import { LISTING_STATUSES } from '../../enums/listing-status.js'
import { LISTING_TYPE } from '../../enums/listing-type.js'
import { LISTING_SORT_COLUMNS } from '../../records/sort-columns.js'
import { Rule, z } from '../../validator.js'

/**
 * What the owner sends to publish a listing (`POST /owner/listings`). The frontend's step-by-step
 * form validates with this same schema, so the screen and the API cannot disagree about what
 * a valid listing is.
 *
 * The ceilings are the form's, and they exist for a reason: free text without a ceiling is
 * how a 1 MB description reaches the database. The prices are whole reais with an upper bound
 * (`100_000`): a typo with an extra zero is the commonest error in a rent field, and the bound
 * catches the worst of it.
 */
export const OwnerListingCreateValidator = z.object({
  type: z.enum(LISTING_TYPE),
  furnished: z.boolean(),
  neighborhood: z.string().trim().min(1).max(60),
  address: z.string().trim().min(5).max(120),
  monthly: z.number().int().min(1).max(100_000),
  daily: z.number().int().min(1).max(10_000).optional(),
  water: z.boolean(),
  electricity: z.boolean(),
  internet: z.boolean(),
  periods: z.array(z.enum(LISTING_PERIOD)).min(1).max(4),
  minimumStayMonths: z.number().int().min(1).max(36),
  title: z.string().trim().min(8).max(80),
  description: z.string().trim().min(20).max(600),
  // Optional with the blank counting as absent (`Rule.optional`): the form's textarea starts and
  // stays `''` when the owner has no rules, and the bodyparser turns `''` into `null` before VineJS,
  // which would refuse a required field. The API used to answer 422 to its own form.
  rules: Rule.optional(z.string().trim().max(600)),
  ownerName: z.string().trim().min(2).max(60),
  whatsapp: z.string().trim().min(10).max(13),
  // Not in the step-by-step form yet: absent means one of each, and the owner corrects it on edit.
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
})

/**
 * What the owner changes in an ad (`PUT /owner/listings/:id`). **Every field is optional**: an
 * absent field means "do not touch", and not "erase" (`AccountProfileUpdateValidator` is the
 * same). The ceilings are the creation's, field by field; the entity checks them again on the
 * result, since a partial payload can still leave the ad without a price.
 */
export const OwnerListingUpdateValidator = z.object({
  type: Rule.optional(z.enum(LISTING_TYPE)),
  furnished: z.boolean().optional(),
  neighborhood: Rule.optional(z.string().trim().min(1).max(60)),
  address: Rule.optional(z.string().trim().min(5).max(120)),
  monthly: Rule.optional(z.number().int().min(1).max(100_000)),
  daily: Rule.optional(z.number().int().min(1).max(10_000)),
  water: z.boolean().optional(),
  electricity: z.boolean().optional(),
  internet: z.boolean().optional(),
  periods: Rule.optional(z.array(z.enum(LISTING_PERIOD)).min(1).max(4)),
  minimumStayMonths: Rule.optional(z.number().int().min(1).max(36)),
  title: Rule.optional(z.string().trim().min(8).max(80)),
  description: Rule.optional(z.string().trim().min(20).max(600)),
  rules: Rule.optional(z.string().trim().max(600)),
  ownerName: Rule.optional(z.string().trim().min(2).max(60)),
  whatsapp: Rule.optional(z.string().trim().min(10).max(13)),
  bedrooms: Rule.optional(z.number().int().min(0).max(20)),
  bathrooms: Rule.optional(z.number().int().min(0).max(20)),
})

/**
 * What `GET /owner/listings` accepts in the query: the owner's own ads, by state if he wants.
 * The scope is the session, never a parameter, so there is no `owner` field to forge.
 */
export const OwnerListingPaginateValidator = z.object({
  ...Rule.paginationFields(),
  status: Rule.optional(z.enum(LISTING_STATUSES)),
  ...Rule.sortFields(LISTING_SORT_COLUMNS),
})

export type OwnerListingCreate = z.infer<typeof OwnerListingCreateValidator>
export type OwnerListingUpdatePayload = z.infer<
  typeof OwnerListingUpdateValidator
>
export type OwnerListingPaginatePayload = z.infer<
  typeof OwnerListingPaginateValidator
>
