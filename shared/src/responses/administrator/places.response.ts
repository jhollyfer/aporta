import type { z } from '../../validator.js'
import { ResponseRule } from '../envelope.js'
import { StorefrontPlaceShowResponse } from '../storefront/places.response.js'

/**
 * The guide place as the staff reads it: the visitor's shape plus `archivedAt`, because the staff
 * list includes the trash (`?trashed=only` is the archive screen) and has to tell a live place
 * from an archived one.
 */
export const AdministratorPlaceShowResponse =
  StorefrontPlaceShowResponse.extend({
    archivedAt: ResponseRule.datetime().nullable(),
  })

export type AdministratorPlaceShowResponse = z.infer<
  typeof AdministratorPlaceShowResponse
>

export const AdministratorPlacePaginateResponse = ResponseRule.paginated(
  AdministratorPlaceShowResponse,
)

export type AdministratorPlacePaginateResponse = z.infer<
  typeof AdministratorPlacePaginateResponse
>
