import * as React from 'react'
import { X } from '@phosphor-icons/react'

import { Button } from '#/components/ui/button'
import { useNeighborhoods } from '#/hooks/use-neighborhoods'
import { formatCurrency } from '#/lib/format'
import { LISTING_PERIOD_LABELS, LISTING_TYPE_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

import { useFilterBar } from './filter-bar-context'

type Chip = { key: string; label: string; remove: () => void }

/** Cada filtro que restringe vira um chip com "x": ver o que está aplicado e tirar com um toque. */
export function FilterBarChips(): React.JSX.Element | null {
  const { filters, onChange } = useFilterBar()
  const neighborhoods = useNeighborhoods()
  const chips: Array<Chip> = []

  if (filters.type !== null) {
    chips.push({
      key: 'type',
      label: LISTING_TYPE_LABELS[filters.type](),
      remove: () => onChange({ type: null }),
    })
  }

  const neighborhood = neighborhoods.find(
    (item) => item.slug === filters.neighborhood,
  )
  if (neighborhood !== undefined) {
    chips.push({
      key: 'neighborhood',
      label: neighborhood.name,
      remove: () => onChange({ neighborhood: null }),
    })
  }

  if (filters.period !== null) {
    chips.push({
      key: 'period',
      label: LISTING_PERIOD_LABELS[filters.period](),
      remove: () => onChange({ period: null }),
    })
  }

  if (filters.minPrice !== null || filters.maxPrice !== null) {
    let maxLabel = '∞'
    if (filters.maxPrice !== null) {
      maxLabel = formatCurrency(filters.maxPrice, getLocale())
    }

    chips.push({
      key: 'price',
      label: m.chip_price({
        min: formatCurrency(filters.minPrice ?? 0, getLocale()),
        max: maxLabel,
      }),
      remove: () => onChange({ minPrice: null, maxPrice: null }),
    })
  }

  if (chips.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-2" aria-label={m.chips_label()}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <Button
            variant="ghost"
            type="button"
            onClick={chip.remove}
            className="inline-flex items-center gap-1.5 rounded-full border border-moss bg-moss-wash px-3 py-1.5 text-sm font-semibold text-moss-deep hover:bg-moss/15"
            aria-label={m.chip_remove({ label: chip.label })}
          >
            {chip.label}
            <X aria-hidden weight="bold" className="size-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  )
}
