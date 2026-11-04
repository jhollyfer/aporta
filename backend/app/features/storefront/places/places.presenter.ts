import type { StorefrontPlaceShowResponse } from '@aporta/shared'

import PlaceSharedPresenter from '#features/_shared.place.presenter'
import type { PlaceRecord } from '#repositories/place/place.repository'

/** The guide place as the visitor reads it (`_standards/architecture.md` §10). */
export default class PlacePresenter {
  static show(record: PlaceRecord): StorefrontPlaceShowResponse {
    return PlaceSharedPresenter.fields(record)
  }
}
