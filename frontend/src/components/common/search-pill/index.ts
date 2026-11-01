import { SearchPillRoot } from './search-pill'
import { SearchPillSegment } from './search-pill-segment'
import { SearchPillSubmit } from './search-pill-submit'

export { SEARCH_FIELD } from './search-pill-context'
export type { SearchValues } from './search-pill-context'

export const SearchPill = Object.assign(SearchPillRoot, {
  Segment: SearchPillSegment,
  Submit: SearchPillSubmit,
})
