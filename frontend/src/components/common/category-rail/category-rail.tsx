import * as React from 'react'

import type { ListingType } from '@aporta/shared'

import { m } from '#/paraglide/messages'
import { cn } from '#/lib/cn'

import { CategoryRailContext } from './category-rail-context'

type CategoryRailRootProps = {
  active?: ListingType | null
  className?: string
  children: React.ReactNode
}

/**
 * A fileira de categorias com ícone, que rola na horizontal. A barra de
 * rolagem fica oculta (`.rail`): sobre uma fileira de ícones ela lê como erro
 * de layout, e o gesto de arrastar já diz que rola.
 */
export function CategoryRailRoot({
  active = null,
  className,
  children,
}: CategoryRailRootProps): React.JSX.Element {
  const value = React.useMemo(() => ({ active }), [active])

  return (
    <CategoryRailContext value={value}>
      <nav aria-label={m.rail_label()}>
        <ul
          className={cn(
            'rail -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0',
            className,
          )}
        >
          {children}
        </ul>
      </nav>
    </CategoryRailContext>
  )
}
