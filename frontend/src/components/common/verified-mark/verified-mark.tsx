import * as React from 'react'

import { PhosphorVerified } from '#/components/common/listing-card/listing-card-icons'
import { cn } from '#/lib/cn'
import { m } from '#/paraglide/messages'

/**
 * "Dono verificado" em linha: o selo e o texto. O texto fica visível (não só o ícone) porque
 * o selo é uma afirmação de confiança, e confiança que só a cor ou o desenho dizem não chega
 * a quem lê por voz. A fila e o detalhe da equipe mostram o mesmo selo que o visitante vê
 * no cartão do dono.
 */
export function VerifiedMark({
  className,
}: {
  className?: string
}): React.JSX.Element {
  return (
    <span
      data-slot="verified-mark"
      className={cn(
        'inline-flex items-center gap-1 text-xs font-bold text-moss',
        className,
      )}
    >
      <PhosphorVerified />
      {m.owner_verified()}
    </span>
  )
}
