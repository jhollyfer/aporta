import * as React from 'react'
import { WarningCircle } from '@phosphor-icons/react'

import { cn } from '#/lib/cn'
import { formatDateTime } from '#/lib/format'
import { m } from '#/paraglide/messages'
import { getLocale } from '#/paraglide/runtime'

type ReviewNoteProps = {
  note: string
  reviewedAt: string
  /** O que fazer a seguir, em uma frase; a lista e a edição dizem a mesma coisa de jeitos curtos. */
  children?: React.ReactNode
  className?: string
}

/**
 * O motivo que a equipe deu ao devolver o anúncio, em destaque: é a única coisa que o dono
 * precisa ler para consertar, e perdida no meio do formulário ele reenviaria o mesmo
 * anúncio e levaria a mesma recusa. Fundo terroso cheio e ícone, sem faixa lateral: o
 * texto "A equipe pediu um ajuste" diz o que é para quem não distingue a cor.
 *
 * Mora em `common/` porque a lista "Meus anúncios" e a edição mostram o mesmo aviso.
 * O texto vem do dono da equipe e quebra em qualquer ponto (`break-words`): uma palavra
 * comprida não pode estourar a tela de 320 px.
 */
export function ReviewNote({
  note,
  reviewedAt,
  children,
  className,
}: ReviewNoteProps): React.JSX.Element {
  return (
    <section
      data-slot="review-note"
      aria-label={m.review_note_title()}
      className={cn(
        'flex flex-col gap-2 rounded-xl bg-clay-wash p-4 text-ink',
        className,
      )}
    >
      <p className="inline-flex items-center gap-2 text-sm font-extrabold">
        <WarningCircle aria-hidden weight="fill" className="size-5 shrink-0" />
        {m.review_note_title()}
      </p>
      <p className="text-base break-words whitespace-pre-line">{note}</p>
      <p className="text-xs font-bold text-ink-soft">
        {formatDateTime(reviewedAt, getLocale())}
      </p>
      {children}
    </section>
  )
}
