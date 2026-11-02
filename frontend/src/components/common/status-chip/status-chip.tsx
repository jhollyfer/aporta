import * as React from 'react'
import {
  Archive,
  CheckCircle,
  Clock,
  PencilSimple,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import type { ListingStatus } from '@aporta/shared'

import { cn } from '#/lib/cn'
import { LISTING_STATUS_LABELS } from '#/lib/labels'

/**
 * Cada estado tem ícone e cor: só a cor não diz nada a quem não a distingue, e o
 * texto sozinho some no meio de uma lista. As cores são tokens do tema, então o claro e
 * o escuro trocam sem regra à parte.
 */
const TRAITS: Record<ListingStatus, { icon: Icon; tone: string }> = {
  DRAFT: { icon: PencilSimple, tone: 'bg-line/60 text-ink' },
  PENDING: { icon: Clock, tone: 'bg-sun/30 text-ink' },
  PUBLISHED: { icon: CheckCircle, tone: 'bg-moss-wash text-moss-deep' },
  ARCHIVED: { icon: Archive, tone: 'bg-clay-wash text-ink' },
}

type StatusChipProps = { status: ListingStatus; className?: string }

/**
 * O estado do anúncio para o dono: em análise, no ar ou arquivado. Mora em `common/`
 * porque a lista, a edição e a tela de "enviado" mostram o mesmo chip.
 */
export function StatusChip({
  status,
  className,
}: StatusChipProps): React.JSX.Element {
  const { icon: StatusIcon, tone } = TRAITS[status]

  return (
    <span
      data-slot="status-chip"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        tone,
        className,
      )}
    >
      <StatusIcon aria-hidden weight="bold" className="size-4" />
      {LISTING_STATUS_LABELS[status]()}
    </span>
  )
}
