import * as React from 'react'
import {
  Archive,
  CheckCircle,
  Clock,
  PencilSimple,
  WarningCircle,
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

import type { ListingStatus } from '@aporta/shared'

import { cn } from '#/lib/cn'
import { LISTING_STATUS_LABELS } from '#/lib/labels'
import { m } from '#/paraglide/messages'

/**
 * Cada estado tem ícone e cor: só a cor não diz nada a quem não a distingue, e o
 * texto sozinho some no meio de uma lista. As cores são tokens do tema, então o claro e
 * o escuro trocam sem regra à parte.
 *
 * `ADJUST` não é um estado da API: é o `DRAFT` que **voltou da análise com motivo**. Para
 * o dono é outra coisa que um rascunho (há o que fazer, e salvar reenvia), e a cor de
 * barro o separa do rascunho neutro.
 */
const TRAITS = {
  DRAFT: { icon: PencilSimple, tone: 'bg-line/60 text-ink' },
  PENDING: { icon: Clock, tone: 'bg-sun/30 text-ink' },
  PUBLISHED: { icon: CheckCircle, tone: 'bg-moss-wash text-moss-deep' },
  ARCHIVED: { icon: Archive, tone: 'bg-clay-wash text-ink' },
  ADJUST: { icon: WarningCircle, tone: 'bg-clay-wash text-ink' },
} as const satisfies Record<
  ListingStatus | 'ADJUST',
  { icon: Icon; tone: string }
>

const LABELS: Record<ListingStatus | 'ADJUST', () => string> = {
  ...LISTING_STATUS_LABELS,
  ADJUST: () => m.label_status_adjust(),
}

type StatusChipProps = {
  status: ListingStatus
  /** Há uma recusa a corrigir (`review.note` num `DRAFT`): o chip diz "Precisa de ajuste". */
  needsAdjustment?: boolean
  className?: string
}

/**
 * O estado do anúncio: em análise, no ar, arquivado ou precisando de ajuste. Mora em
 * `common/` porque a lista do dono, a edição, a tela de "enviado" e a fila da equipe
 * mostram o mesmo chip.
 */
export function StatusChip({
  status,
  needsAdjustment = false,
  className,
}: StatusChipProps): React.JSX.Element {
  let key: ListingStatus | 'ADJUST' = status
  if (needsAdjustment && status === 'DRAFT') key = 'ADJUST'

  const { icon: StatusIcon, tone } = TRAITS[key]

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
      {LABELS[key]()}
    </span>
  )
}
