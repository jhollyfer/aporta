import * as React from 'react'

import { LISTING_PERIODS, LISTING_TYPES } from '@aporta/shared'

import { NEIGHBORHOODS } from '#/lib/data/neighborhoods'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { SEARCH_FIELD, useSearchPill } from './search-pill-context'
import type { SearchField } from './search-pill-context'

type Option = { value: string; label: string }

type FieldSpec = {
  label: () => string
  any: () => string
  options: () => ReadonlyArray<Option>
}

const FIELDS: Record<SearchField, FieldSpec> = {
  [SEARCH_FIELD.TYPE]: {
    label: () => m.search_type_label(),
    any: () => m.search_type_any(),
    options: () =>
      LISTING_TYPES.map((value) => ({
        value,
        label: LISTING_TYPE_LABELS[value](),
      })),
  },
  [SEARCH_FIELD.NEIGHBORHOOD]: {
    label: () => m.search_neighborhood_label(),
    any: () => m.search_neighborhood_any(),
    options: () =>
      NEIGHBORHOODS.map((item) => ({ value: item.slug, label: item.name })),
  },
  [SEARCH_FIELD.PERIOD]: {
    label: () => m.search_period_label(),
    any: () => m.search_period_any(),
    options: () =>
      LISTING_PERIODS.map((value) => ({
        value,
        label: LISTING_PERIOD_LABELS[value](),
      })),
  },
}

/** Um segmento da pílula: rótulo pequeno em cima, `select` nativo embaixo. */
export function SearchPillSegment({
  field,
}: {
  field: SearchField
}): React.JSX.Element {
  const { values, setValue } = useSearchPill()
  const spec = FIELDS[field]
  const id = React.useId()

  return (
    <div className="flex flex-1 flex-col rounded-2xl px-4 py-2 hover:bg-moss-wash/60 sm:rounded-full sm:border-r sm:border-line sm:last:border-r-0">
      <label htmlFor={id} className="text-xs font-bold text-ink">
        {spec.label()}
      </label>
      <select
        id={id}
        value={values[field]}
        onChange={(event) => setValue(field, event.target.value)}
        className="w-full bg-transparent text-sm text-ink-soft outline-none"
      >
        <option value="">{spec.any()}</option>
        {spec.options().map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
