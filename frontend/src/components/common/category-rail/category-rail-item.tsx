import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Bed,
  Buildings,
  DoorOpen,
  House,
  Suitcase,
} from '@phosphor-icons/react'
import type { Icon, IconWeight } from '@phosphor-icons/react'

import type { ListingType } from '@aporta/shared'

import { LISTING_TYPE_LABELS } from '#/lib/labels'
import { cn } from '#/lib/cn'

import { useCategoryRail } from './category-rail-context'

const ICONS: Record<ListingType, Icon> = {
  HOUSE: House,
  APARTMENT: Buildings,
  KITNET: DoorOpen,
  ROOM: Bed,
  HOTEL: Suitcase,
}

export function CategoryRailItem({
  type,
}: {
  type: ListingType
}): React.JSX.Element {
  const { active } = useCategoryRail()
  const Glyph = ICONS[type]
  const selected = active === type
  let weight: IconWeight = 'regular'
  if (selected) weight = 'fill'

  return (
    <li className="shrink-0">
      <Link
        to="/listings"
        search={{ type }}
        aria-current={selected && 'true'}
        className={cn(
          'flex min-w-24 flex-col items-center gap-1.5 rounded-2xl border border-transparent px-4 py-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-moss-wash hover:text-ink motion-reduce:transition-none',
          selected && 'border-moss bg-moss-wash text-ink',
        )}
      >
        <Glyph aria-hidden className="size-7" weight={weight} />
        {LISTING_TYPE_LABELS[type]()}
      </Link>
    </li>
  )
}
