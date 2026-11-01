import { FilterBarActions } from './filter-bar-actions'
import { FilterBarChips } from './filter-bar-chips'
import { FilterBarFields } from './filter-bar-fields'
import { FilterBarRoot } from './filter-bar'

export const FilterBar = Object.assign(FilterBarRoot, {
  Fields: FilterBarFields,
  Chips: FilterBarChips,
  Actions: FilterBarActions,
})
