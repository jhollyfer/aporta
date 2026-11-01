import { LISTING_PERIOD } from '../../enums/listing-period.js'
import { LISTING_TYPE } from '../../enums/listing-type.js'
import { z } from '../../validator.js'
import type { OwnerListingCreate } from '../owner/listings.validator.js'

/**
 * The draft of the owner's listing that the frontend keeps in `localStorage`
 * (`frontend/src/hooks/use-draft-storage.ts`). Not an endpoint body: it is the validator of
 * outside data that the client keeps, under `validators/client/` (`architecture.md` §9).
 *
 * It is deliberately LOOSE, and it is not `OwnerListingCreateValidator`: a draft is
 * unfinished by definition, so a half-typed address would fail the real validator and the
 * whole draft would be thrown away. Each field falls back to its empty value on its own
 * (`.catch`), so a corrupted or old-shaped field loses only itself.
 */
export type ClientListingDraft = Partial<OwnerListingCreate>

export const EMPTY_LISTING_DRAFT: ClientListingDraft = {
  furnished: false,
  neighborhood: '',
  address: '',
  water: false,
  electricity: false,
  internet: false,
  periods: [],
  title: '',
  description: '',
  rules: '',
  ownerName: '',
  whatsapp: '',
}

export const ClientListingDraftValidator = z.object({
  type: z.enum(LISTING_TYPE).optional().catch(undefined),
  furnished: z.boolean().catch(false),
  neighborhood: z.string().max(60).catch(''),
  address: z.string().max(120).catch(''),
  monthly: z.number().optional().catch(undefined),
  daily: z.number().optional().catch(undefined),
  water: z.boolean().catch(false),
  electricity: z.boolean().catch(false),
  internet: z.boolean().catch(false),
  periods: z.array(z.enum(LISTING_PERIOD)).max(4).catch([]),
  minimumStayMonths: z.number().optional().catch(undefined),
  title: z.string().max(80).catch(''),
  description: z.string().max(600).catch(''),
  rules: z.string().max(600).catch(''),
  ownerName: z.string().max(60).catch(''),
  whatsapp: z.string().max(13).catch(''),
})
