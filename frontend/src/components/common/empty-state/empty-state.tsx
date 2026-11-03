import * as React from 'react'

import { MagnifyingGlass } from '@phosphor-icons/react'

type EmptyStateProps = {
  title: string
  description: string
  children?: React.ReactNode
}

/**
 * O estado vazio ensina o que fazer em vez de só dizer "nada aqui": uma busca
 * sem resultado é o momento em que o visitante precisa de uma saída (limpar
 * filtro, ver todos). Só um ícone de linha discreto: sem ilustração.
 */
export function EmptyState({
  title,
  description,
  children,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      data-slot="empty-state"
      className="flex flex-col items-center gap-4 rounded-card bg-moss-wash px-6 py-12 text-center"
    >
      <MagnifyingGlass
        aria-hidden
        className="size-8 text-ink-soft"
        weight="light"
      />
      <h2 className="text-xl font-extrabold text-ink">{title}</h2>
      <p className="max-w-md text-ink-soft">{description}</p>
      {children}
    </div>
  )
}
