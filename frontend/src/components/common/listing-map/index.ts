import { ListingMapRoot } from './listing-map'
import { ListingMapStatus } from './listing-map-status'
import { ListingMapSummary } from './listing-map-summary'

export const ListingMap = Object.assign(ListingMapRoot, {
  Status: ListingMapStatus,
  Summary: ListingMapSummary,
})
