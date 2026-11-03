import * as React from 'react'
import { Link } from '@tanstack/react-router'

import { PLACE_CATEGORIES } from '@aporta/shared'
import type { PlaceCategory } from '@aporta/shared'

import { PLACE_CATEGORY_LABELS } from '#/lib/labels'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * As abas do guia (Comer, Beber, Eventos, Serviços), como links para
 * `/guide?category=`. A aba mora na URL: o guia é para mandar o link a quem
 * acabou de chegar ("olha os bares"), e aba em `useState` some no F5 e não
 * se compartilha.
 */
export function GuideTabs({
  active,
  className,
}: {
  active: PlaceCategory
  className?: string
}): React.JSX.Element {
  return (
    <nav aria-label={m.guide_tabs_label()} className={className}>
      <ul className="flex flex-wrap gap-2">
        {PLACE_CATEGORIES.map((category) => (
          <li key={category}>
            <Link
              to="/guide"
              search={{ category }}
              aria-current={category === active && 'page'}
              className={cn(
                'inline-flex h-11 items-center rounded-full bg-moss-wash px-5 text-sm font-bold text-moss-deep hover:bg-moss/20',
                category === active && 'bg-moss text-paper hover:bg-moss',
              )}
            >
              {PLACE_CATEGORY_LABELS[category]()}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
