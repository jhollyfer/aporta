import * as React from 'react'

import { activeFilterCount } from '#/lib/filters'
import { m } from '#/paraglide/messages'

import { useFilterBar } from './filter-bar-context'

/** "Limpar" só existe com filtro aplicado, e o botão final diz o tamanho do resultado. */
export function FilterBarActions(): React.JSX.Element {
  const { filters, count, onClear, onApply } = useFilterBar()
  const active = activeFilterCount(filters)

  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onClear}
        disabled={active === 0}
        className="text-sm font-bold text-ink underline underline-offset-4 disabled:opacity-40"
      >
        {m.filter_clear()}
      </button>
      <button
        type="button"
        onClick={onApply}
        className="h-11 rounded-full bg-ink px-5 text-sm font-bold text-paper hover:bg-moss-deep"
      >
        {m.filter_show({ count })}
      </button>
    </div>
  )
}
