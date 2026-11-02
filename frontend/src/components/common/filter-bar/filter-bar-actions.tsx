import * as React from 'react'

import { ActionButton } from '#/components/common/action-button'
import { activeFilterCount } from '#/lib/filters'
import { m } from '#/paraglide/messages'

import { useFilterBar } from './filter-bar-context'

/** "Limpar" só existe com filtro aplicado, e o botão final diz o tamanho do resultado. */
export function FilterBarActions(): React.JSX.Element {
  const { filters, count, onClear, onApply } = useFilterBar()
  const active = activeFilterCount(filters)

  return (
    <div className="flex items-center justify-between gap-3">
      <ActionButton tone="link" onClick={onClear} disabled={active === 0}>
        {m.filter_clear()}
      </ActionButton>
      <ActionButton onClick={onApply}>{m.filter_show({ count })}</ActionButton>
    </div>
  )
}
