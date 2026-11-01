import * as React from 'react'
import { Link } from '@tanstack/react-router'

import type { Listing } from '@aporta/shared'

import { cn } from '#/lib/cn'

import { ListingCardContext } from './listing-card-context'

type ListingCardRootProps = {
  listing: Listing
  className?: string
  children: React.ReactNode
}

/**
 * O card inteiro é o link: o alvo de toque é o cartão, não um "ver mais"
 * pequeno no canto. Dentro dele não entra botão nem outro link, porque
 * interativo dentro de interativo quebra o teclado e o leitor de tela; o
 * WhatsApp mora no detalhe.
 */
export function ListingCardRoot({
  listing,
  className,
  children,
}: ListingCardRootProps): React.JSX.Element {
  const value = React.useMemo(() => ({ listing }), [listing])

  return (
    <ListingCardContext value={value}>
      <Link
        to="/listings/$slug"
        params={{ slug: listing.slug }}
        className={cn(
          'group flex flex-col gap-3 rounded-card focus-visible:outline-offset-4',
          className,
        )}
      >
        {children}
      </Link>
    </ListingCardContext>
  )
}
