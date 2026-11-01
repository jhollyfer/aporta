import { LISTING_PERIOD } from '../../enums/listing-period.js'
import { LISTING_TYPE } from '../../enums/listing-type.js'
import { z } from '../../validator.js'

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
  rules: z.string().trim().max(600),
  ownerName: z.string().trim().min(2).max(60),
  whatsapp: z.string().trim().min(10).max(13),
})

export type OwnerListingCreate = z.infer<typeof OwnerListingCreateValidator>
