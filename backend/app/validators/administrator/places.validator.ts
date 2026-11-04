import { PLACE_CATEGORIES, PLACE_SORT_COLUMNS } from '@aporta/shared'

import {
  paginationFields,
  sortFields,
  trashedField,
  vine,
} from '#core/validator'
import type { Infer } from '#core/validator'

/**
 * What `GET /administrator/places` accepts in the query. The VineJS pair of the Zod
 * `AdministratorPlacePaginateValidator` in `@aporta/shared`: the tab, the trash slice (the staff
 * sees what the storefront never does) and the order.
 */
export const AdministratorPlacePaginateValidator = vine.create({
  ...paginationFields(),
  category: vine.enum(PLACE_CATEGORIES).optional(),
  ...trashedField(),
  ...sortFields(PLACE_SORT_COLUMNS),
})

/**
 * What the staff sends to create and to edit a place of the guide. The VineJS pair of the Zod
 * `AdministratorPlaceWriteValidator`, with the same ceilings (the `places` columns). The edit is a
 * replacement: `category` and `date` depend on each other, which the entity checks. That the
 * neighborhood exists is the use-case's to check through the repository (422 on the field).
 */
export const AdministratorPlaceWriteValidator = vine.create({
  category: vine.enum(PLACE_CATEGORIES),
  name: vine.string().trim().minLength(2).maxLength(80),
  description: vine.string().trim().minLength(10).maxLength(600),
  neighborhood: vine.string().trim().minLength(1).maxLength(60),
  address: vine.string().trim().minLength(5).maxLength(120),
  hours: vine.string().trim().minLength(3).maxLength(80),
  whatsapp: vine.string().trim().minLength(10).maxLength(13).optional(),
  date: vine
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export type AdministratorPlacePaginatePayload = Infer<
  typeof AdministratorPlacePaginateValidator
>
export type AdministratorPlaceWritePayload = Infer<
  typeof AdministratorPlaceWriteValidator
>
