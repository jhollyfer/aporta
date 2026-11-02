import * as React from 'react'

import type { PaginationMeta } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { m } from '#/paraglide/messages'

type PaginationNavProps = {
  meta: PaginationMeta
  onPage: (page: number) => void
}

/**
 * "Anterior", "Página 2 de 5" e "Próxima". Some com uma página só: a fila curta não ganha
 * uma barra que não leva a lugar nenhum. A página mora na URL (`validateSearch`), então
 * quem usa só troca o número; recarregar ou colar o link mantém o lugar.
 */
export function PaginationNav({
  meta,
  onPage,
}: PaginationNavProps): React.JSX.Element | null {
  if (meta.lastPage <= 1) return null

  return (
    <nav
      aria-label={m.pagination_label()}
      className="grid grid-cols-2 items-center gap-3 sm:flex sm:justify-between"
    >
      <ActionButton
        tone="outline"
        disabled={meta.currentPage <= meta.firstPage}
        onClick={() => onPage(meta.currentPage - 1)}
      >
        {m.pagination_previous()}
      </ActionButton>
      <p
        aria-live="polite"
        className="order-first col-span-2 text-center text-sm font-bold text-ink-soft sm:order-none sm:col-span-1"
      >
        {m.pagination_status({ page: meta.currentPage, total: meta.lastPage })}
      </p>
      <ActionButton
        tone="outline"
        disabled={meta.currentPage >= meta.lastPage}
        onClick={() => onPage(meta.currentPage + 1)}
      >
        {m.pagination_next()}
      </ActionButton>
    </nav>
  )
}
