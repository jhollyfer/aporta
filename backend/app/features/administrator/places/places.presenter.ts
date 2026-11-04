import type { AdministratorPlaceShowResponse } from '@aporta/shared'

import { WireDate } from '#core/response'
import PlaceSharedPresenter from '#features/_shared.place.presenter'
import type { PlaceRecord } from '#repositories/place/place.repository'

/**
 * The guide place as the staff reads it (`_standards/architecture.md` §10), by allowlist: the
 * visitor's shape plus when it left the guide. Never `neighborhoodId` nor the raw `deletedAt`.
 */
export default class AdministratorPlacePresenter {
  static show(record: PlaceRecord): AdministratorPlaceShowResponse {
    return {
      ...PlaceSharedPresenter.fields(record),
      archivedAt: WireDate.isoOrNull(record.place.snapshot().deletedAt),
    }
  }
}
