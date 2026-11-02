import type { OwnerListingShowResponse } from '@aporta/shared'

export type ReturnedReview = { note: string; reviewedAt: string }

/**
 * A recusa que o dono ainda precisa tratar: o anúncio está em `DRAFT` **e** a decisão da
 * equipe trouxe um motivo. Um `DRAFT` sem motivo é rascunho comum, e uma decisão antiga
 * não vale em anúncio que já voltou para a análise (a API limpa o `review` quando o dono
 * edita). Devolve `undefined` quando não há o que tratar.
 *
 * Mora em `lib/` porque a lista, a edição e o chip leem a mesma regra, e "precisa de
 * ajuste" não pode ser uma coisa numa tela e outra na vizinha.
 */
export function returnedReview(
  listing: Pick<OwnerListingShowResponse, 'status' | 'review'>,
): ReturnedReview | undefined {
  const { review } = listing

  if (listing.status !== 'DRAFT' || review === null) return undefined
  if (typeof review.note !== 'string') return undefined

  return { note: review.note, reviewedAt: review.reviewedAt }
}
