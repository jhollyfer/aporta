import * as React from 'react'

import type { PaginationMeta } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '#/components/ui/pagination'
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
    <Pagination aria-label={m.pagination_label()}>
      <PaginationContent className="grid w-full grid-cols-2 items-center gap-3 sm:flex sm:justify-between">
        <PaginationItem>
          <ActionButton
            tone="outline"
            disabled={meta.currentPage <= meta.firstPage}
            onClick={() => onPage(meta.currentPage - 1)}
          >
            {m.pagination_previous()}
          </ActionButton>
        </PaginationItem>
        <PaginationItem className="order-first col-span-2 sm:order-none sm:col-span-1">
          <p
            aria-live="polite"
            className="text-center text-sm font-bold text-ink-soft"
          >
            {m.pagination_status({
              page: meta.currentPage,
              total: meta.lastPage,
            })}
          </p>
        </PaginationItem>
        <PaginationItem className="justify-self-end">
          <ActionButton
            tone="outline"
            disabled={meta.currentPage >= meta.lastPage}
            onClick={() => onPage(meta.currentPage + 1)}
          >
            {m.pagination_next()}
          </ActionButton>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
