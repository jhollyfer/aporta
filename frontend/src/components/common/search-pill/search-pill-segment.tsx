import * as React from 'react'

import { LISTING_PERIODS, LISTING_TYPES } from '@aporta/shared'
import type { StorefrontNeighborhoodShowResponse } from '@aporta/shared'

import { useNeighborhoods } from '#/hooks/use-neighborhoods'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { SEARCH_FIELD, useSearchPill } from './search-pill-context'
import type { SearchField } from './search-pill-context'

type Option = { value: string; label: string }

type FieldSpec = {
  label: () => string
  any: () => string
  /** Os bairros vêm da API, então quem desenha os repassa; só o campo de bairro os usa. */
  options: (
    neighborhoods: ReadonlyArray<StorefrontNeighborhoodShowResponse>,
  ) => ReadonlyArray<Option>
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
    options: (neighborhoods) =>
      neighborhoods.map((item) => ({ value: item.slug, label: item.name })),
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
  const neighborhoods = useNeighborhoods()
  const spec = FIELDS[field]
  const id = React.useId()

  return (
    <div className="relative flex-1 rounded-2xl hover:bg-moss-wash/60 sm:rounded-full">
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-2 left-4 text-xs font-bold text-ink"
      >
        {spec.label()}
      </label>
      <select
        id={id}
        value={values[field]}
        onChange={(event) => setValue(field, event.target.value)}
        className="h-14 w-full rounded-[inherit] bg-transparent px-4 pt-5 text-sm text-ink-soft focus-visible:outline-offset-[-2px]"
      >
        <option value="">{spec.any()}</option>
        {spec.options(neighborhoods).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
