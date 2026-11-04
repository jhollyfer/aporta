import {
  AccountProfileShowResponse,
  AccountProfileUpdateResponse,
  AdministratorListingPaginateResponse,
  AdministratorListingShowResponse,
  AdministratorOwnerVerifyResponse,
  AdministratorPlacePaginateResponse,
  AdministratorPlaceShowResponse,
  AdministratorReportPaginateResponse,
  AdministratorReportShowResponse,
  AdministratorUserPaginateResponse,
  AdministratorUserShowResponse,
  OwnerListingPaginateResponse,
  OwnerListingPhotoCreateResponse,
  OwnerListingShowResponse,
  StorageFileCompleteResponse,
  StorageFileCreateResponse,
  StorageFilePaginateResponse,
  StorageFilePartsResponse,
  StorageFileShowResponse,
  StorefrontListingPaginateResponse,
  StorefrontListingShowResponse,
  StorefrontNeighborhoodPaginateResponse,
  StorefrontPlacePaginateResponse,
  StorefrontReportCreateResponse,
} from '@aporta/shared'

import type { ResponseSchema } from '#core/openapi/types'

/**
 * The registry of which response schema answers for each API action
 * (`_standards/openapi.md#registro-de-resposta`). The registry **points**; the
 * schema lives in `shared/src/responses/` and is the same one the frontend uses to
 * convert the body (`_standards/architecture.md` §10).
 *
 * The key is the action's path under `app/features/`, and the lookup climbs: action
 * `storage/files/show` tries the full key and then
 * `storage/files`. A resource entry covers the actions that return the
 * same shape; one that departs from it gets its own key. `paginate` always has its
 * own: without it the listing would come out documented as the raw item, and the generator
 * leaves it without a body for `--strict` to reject.
 *
 * An action that answers `204` needs no entry: the generator does not even look.
 */
export const RESPONSES: Readonly<Record<string, ResponseSchema>> = {
  'account/profile/show': AccountProfileShowResponse,
  'account/profile/update': AccountProfileUpdateResponse,

  /**
   * Sign-up answers the profile of the account it created, the same shape as `GET /account`.
   * The other `authentication/session` actions answer `204` and need no entry.
   */
  'authentication/session/sign-up': AccountProfileShowResponse,

  /**
   * The staff's moderation. `show`, `review` answer the ad as the staff reads it; `archive`
   * answers `204`. The report `resolve` answers the report it closed. The guide's `show`,
   * `create` and `update` answer the place as the staff reads it; `archive`, `unarchive` and
   * `delete` answer `204`. The accounts (`users`) answer the account on `show`, `change-role` and
   * `change-status`.
   */
  'administrator/listings': AdministratorListingShowResponse,
  'administrator/listings/paginate': AdministratorListingPaginateResponse,
  'administrator/owners': AdministratorOwnerVerifyResponse,
  'administrator/places': AdministratorPlaceShowResponse,
  'administrator/places/paginate': AdministratorPlacePaginateResponse,
  'administrator/reports': AdministratorReportShowResponse,
  'administrator/reports/paginate': AdministratorReportPaginateResponse,
  'administrator/users': AdministratorUserShowResponse,
  'administrator/users/paginate': AdministratorUserPaginateResponse,

  /**
   * The owner's ads. `show`, `create` and `update` answer the same shape; `paginate` has its own
   * key, and the photos answer with the whole ad. `archive` answers `204` and needs no entry.
   */
  'owner/listings': OwnerListingShowResponse,
  'owner/listings/paginate': OwnerListingPaginateResponse,
  'owner/listing-photos': OwnerListingPhotoCreateResponse,

  /**
   * `create` and `parts` answer the upload plan, not the file; `download`
   * is a bodyless redirect and declares that in the controller itself.
   */
  'storage/files': StorageFileShowResponse,
  'storage/files/complete': StorageFileCompleteResponse,
  'storage/files/create': StorageFileCreateResponse,
  'storage/files/parts': StorageFilePartsResponse,
  'storage/files/paginate': StorageFilePaginateResponse,

  /**
   * The public storefront. `paginate` has its own key per resource (the listing would otherwise
   * come out documented as the raw item); the neighborhoods and the guide have no `show`.
   */
  'storefront/listings': StorefrontListingShowResponse,
  'storefront/listings/paginate': StorefrontListingPaginateResponse,
  'storefront/neighborhoods/paginate': StorefrontNeighborhoodPaginateResponse,
  'storefront/places/paginate': StorefrontPlacePaginateResponse,
  'storefront/reports': StorefrontReportCreateResponse,
}
