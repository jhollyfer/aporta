import * as React from 'react'

import { LISTING_PERIODS, LISTING_TYPES } from '@aporta/shared'
import type { ListingPeriod, ListingType } from '@aporta/shared'

import { NativeSelect, NativeSelectOption } from '#/components/ui/native-select'
import { Input } from '#/components/ui/input'
import { useNeighborhoods } from '#/hooks/use-neighborhoods'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

import { useFilterBar } from './filter-bar-context'

const PRICE_ERROR_ID = 'filter-price-error'

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
  const neighborhoods = useNeighborhoods()
  const priceInvalid =
    filters.minPrice !== null &&
    filters.maxPrice !== null &&
    filters.minPrice > filters.maxPrice
  let priceDescription: string | undefined
  if (priceInvalid) priceDescription = PRICE_ERROR_ID

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.search_type_label()}
        <NativeSelect
          className="[&_select]:h-11 [&_select]:text-sm"
          value={filters.type ?? ''}
          onChange={(event) => onChange({ type: toType(event.target.value) })}
        >
          <NativeSelectOption value="">
            {m.search_type_any()}
          </NativeSelectOption>
          {LISTING_TYPES.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {LISTING_TYPE_LABELS[value]()}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>

      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.search_neighborhood_label()}
        <NativeSelect
          className="[&_select]:h-11 [&_select]:text-sm"
          value={filters.neighborhood ?? ''}
          onChange={(event) =>
            onChange({ neighborhood: event.target.value || null })
          }
        >
          <NativeSelectOption value="">
            {m.search_neighborhood_any()}
          </NativeSelectOption>
          {neighborhoods.map((item) => (
            <NativeSelectOption key={item.slug} value={item.slug}>
              {item.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>

      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.search_period_label()}
        <NativeSelect
          className="[&_select]:h-11 [&_select]:text-sm"
          value={filters.period ?? ''}
          onChange={(event) =>
            onChange({ period: toPeriod(event.target.value) })
          }
        >
          <NativeSelectOption value="">
            {m.search_period_any()}
          </NativeSelectOption>
          {LISTING_PERIODS.map((value) => (
            <NativeSelectOption key={value} value={value}>
              {LISTING_PERIOD_LABELS[value]()}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>

      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.filter_price_min()}
        <Input
          key={`min-${filters.minPrice}`}
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          defaultValue={filters.minPrice ?? ''}
          aria-invalid={priceInvalid || undefined}
          aria-describedby={priceDescription}
          onBlur={(event) =>
            onChange({ minPrice: toNumber(event.target.value) })
          }
          className="h-11 text-sm md:text-sm"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-bold">
        {m.filter_price_max()}
        <Input
          key={`max-${filters.maxPrice}`}
          type="number"
          inputMode="numeric"
          min={0}
          step={50}
          defaultValue={filters.maxPrice ?? ''}
          aria-invalid={priceInvalid || undefined}
          aria-describedby={priceDescription}
          onBlur={(event) =>
            onChange({ maxPrice: toNumber(event.target.value) })
          }
          className="h-11 text-sm md:text-sm"
        />
      </label>

      {priceInvalid && (
        <p
          id={PRICE_ERROR_ID}
          role="alert"
          className="col-span-2 text-sm font-bold text-danger lg:col-span-5"
        >
          {m.filter_price_invalid()}
        </p>
      )}
    </div>
  )
}
