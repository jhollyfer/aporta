import * as React from 'react'

import { cn } from '#/lib/cn'

import { FilterBarContext } from './filter-bar-context'
import type { FilterBarContextValue } from './filter-bar-context'

type FilterBarRootProps = FilterBarContextValue & {
  className?: string
  children: React.ReactNode
}

/**
 * A barra de filtros: poucos (preço, bairro, período e tipo), então cabem
 * numa fileira só e dispensam modal. O que está aplicado aparece como chip
 * removível e o botão final diz quantos imóveis sobram, como o Airbnb faz.
 *
 * O filtro vale na hora, porque ele mora na URL: "Mostrar N imóveis" não
 * aplica nada, só leva o olho (e, no celular, a tela) até o resultado.
 */
export function FilterBarRoot({
  filters,
  count,
  onChange,
  onClear,
  onApply,
  className,
  children,
}: FilterBarRootProps): React.JSX.Element {
  const value = React.useMemo(
    () => ({ filters, count, onChange, onClear, onApply }),
    [filters, count, onChange, onClear, onApply],
  )

  return (
    <FilterBarContext value={value}>
      <section className={cn('flex flex-col gap-3', className)}>
        {children}
      </section>
    </FilterBarContext>
  )
}
