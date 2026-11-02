import * as React from 'react'
import { Check, X } from '@phosphor-icons/react'

import type { ListingCosts } from '@aporta/shared'

import { m } from '#/paraglide/messages'

type Row = { key: keyof ListingCosts; label: () => string }

const ROWS: ReadonlyArray<Row> = [
  { key: 'water', label: () => m.cost_water_label() },
  { key: 'electricity', label: () => m.cost_electricity_label() },
  { key: 'internet', label: () => m.cost_internet_label() },
]

/**
 * O que está incluso no valor, linha a linha. Cada linha diz "incluso" ou "por
 * sua conta" em texto, além do ícone: cor e ícone sozinhos não bastam para quem
 * não os distingue, e esta é a informação que decide a conta do mês.
 */
export function Costs({ costs }: { costs: ListingCosts }): React.JSX.Element {
  return (
    <ul className="flex flex-col gap-1.5 text-base">
      {ROWS.map((row) => (
        <li key={row.key} className="flex items-center gap-2 text-ink">
          {costs[row.key] && (
            <Check aria-hidden weight="bold" className="size-5 text-moss" />
          )}
          {!costs[row.key] && (
            <X aria-hidden weight="bold" className="size-5 text-danger" />
          )}
          <span className="font-bold">{row.label()}</span>
          <span className="text-ink-soft">
            {costs[row.key] && m.cost_included()}
            {!costs[row.key] && m.cost_not_included()}
          </span>
        </li>
      ))}
    </ul>
  )
}
