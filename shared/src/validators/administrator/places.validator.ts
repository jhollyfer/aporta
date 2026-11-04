import { PLACE_CATEGORY } from '../../enums/place-category.js'
import { PLACE_SORT_COLUMNS } from '../../records/sort-columns.js'
import { Rule, z } from '../../validator.js'

/**
 * What `GET /administrator/places` accepts in the query: the tab of the guide (`category`), the
 * trash slice (`trashed`, absent means only the live ones, `only` is the archive screen) and the
 * order. Unlike the storefront, the staff sees the trash, so `trashed` is part of the contract.
 */
export const AdministratorPlacePaginateValidator = z.object({
  ...Rule.paginationFields(),
  category: Rule.optional(z.enum(PLACE_CATEGORY)),
  ...Rule.trashedField(),
  ...Rule.sortFields(PLACE_SORT_COLUMNS),
})

/**
 * What the staff sends to create (`POST /administrator/places`) and to edit
 * (`PUT /administrator/places/:id`) a place of the guide. Both carry the whole set of fields: the
 * edit is a replacement, because `category` and `date` depend on each other (an event has a day,
 * the rest do not) and a partial body could leave the pair half changed.
 *
 * The ceilings are the columns' (`places` migration). `neighborhood` is the `slug`, like the
 * owner's ad form, and that it exists is the use-case's to check. `whatsapp` is optional with the
 * blank counting as absent (a bank branch or a street fair has no number); `date` is
 * `YYYY-MM-DD`, required for an `EVENT` and refused for any other category, which the entity
 * enforces (a rule across two fields is not something both validator libraries express alike).
 */
export const AdministratorPlaceWriteValidator = z.object({
  category: z.enum(PLACE_CATEGORY),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(10).max(600),
  neighborhood: z.string().trim().min(1).max(60),
  address: z.string().trim().min(5).max(120),
  hours: z.string().trim().min(3).max(80),
  whatsapp: Rule.optional(z.string().trim().min(10).max(13)),
  date: Rule.optional(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
})

export type AdministratorPlacePaginatePayload = z.infer<
  typeof AdministratorPlacePaginateValidator
>
export type AdministratorPlaceWritePayload = z.infer<
  typeof AdministratorPlaceWriteValidator
>
