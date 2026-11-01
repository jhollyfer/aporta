import * as React from 'react'

import { LISTING_PERIODS, LISTING_TYPES } from '@aporta/shared'
import type { ListingPeriod, ListingType } from '@aporta/shared'

import { NEIGHBORHOODS } from '#/lib/data/neighborhoods'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { useFilterBar } from './filter-bar-context'

const FIELD =
  'h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink'

function toNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw)
  if (Number.isNaN(value) || value < 0) return null
  return Math.round(value)
}

/*
 * O `select` entrega string, e o filtro quer o tipo fechado. Procurar na lista
 * devolve o próprio valor tipado, sem `as`: valor fora da lista vira `null`.
 */
function toType(raw: string): ListingType | null {
  return LISTING_TYPES.find((item) => item === raw) ?? null
}

function toPeriod(raw: string): ListingPeriod | null {
  return LISTING_PERIODS.find((item) => item === raw) ?? null
}

/**
 * Os campos. Preço é commitado ao sair do campo (`onBlur`) e não a cada tecla:
 * cada tecla viraria uma navegação, e digitar "900" passaria por "9" e "90".
 */
export function FilterBarFields(): React.JSX.Element {
  const { filters, onChange } = useFilterBar()

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.search_type_label()}
        <select
          className={FIELD}
          value={filters.type ?? ''}
          onChange={(event) => onChange({ type: toType(event.target.value) })}
        >
          <option value="">{m.search_type_any()}</option>
          {LISTING_TYPES.map((value) => (
            <option key={value} value={value}>
              {LISTING_TYPE_LABELS[value]()}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.search_neighborhood_label()}
        <select
          className={FIELD}
          value={filters.neighborhood ?? ''}
          onChange={(event) =>
            onChange({ neighborhood: event.target.value || null })
          }
        >
          <option value="">{m.search_neighborhood_any()}</option>
          {NEIGHBORHOODS.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.search_period_label()}
        <select
          className={FIELD}
          value={filters.period ?? ''}
          onChange={(event) =>
            onChange({ period: toPeriod(event.target.value) })
          }
        >
          <option value="">{m.search_period_any()}</option>
          {LISTING_PERIODS.map((value) => (
            <option key={value} value={value}>
              {LISTING_PERIOD_LABELS[value]()}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.filter_price_min()}
        <input
          key={`min-${filters.minPrice}`}
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          defaultValue={filters.minPrice ?? ''}
          onBlur={(event) =>
            onChange({ minPrice: toNumber(event.target.value) })
          }
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.filter_price_max()}
        <input
          key={`max-${filters.maxPrice}`}
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          defaultValue={filters.maxPrice ?? ''}
          onBlur={(event) =>
            onChange({ maxPrice: toNumber(event.target.value) })
          }
          className={FIELD}
        />
      </label>
    </div>
  )
}
