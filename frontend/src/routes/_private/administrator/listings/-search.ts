import { z } from 'zod'

import { LISTING_STATUS } from '@aporta/shared'
import type {
  AdministratorListingPaginatePayload,
  ListingStatus,
} from '@aporta/shared'

/** A fila abre no que espera decisão: é o motivo de a equipe entrar. */
export const DEFAULT_QUEUE_STATUS: ListingStatus = LISTING_STATUS.PENDING

/** Quantos anúncios por página: o bastante para rolar uma fila, sem pesar no celular. */
export const QUEUE_PER_PAGE = 20

/**
 * O estado da fila na URL: o filtro de estado, a página e o texto buscado (`q`, título ou descrição, que a API procura). Quem cola o link vê a mesma fila
 * e o F5 não perde o lugar. Cada campo leva `.catch(undefined)`: endereço colado errado
 * (`?status=castelo`, `?page=-3`) volta ao padrão em vez de derrubar a página, e o estado
 * padrão não vai à URL (`?status=PENDING` e nada são a mesma fila).
 */
export const queueSearchSchema = z.object({
  status: z.enum(LISTING_STATUS).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
})

export type QueueSearch = z.infer<typeof queueSearchSchema>

/**
 * O search da URL em parâmetros da API. Ordena por `updatedAt`, a data que o dono mexeu
 * por último (a de reenvio, para quem editou depois de uma recusa); a direção é a do
 * servidor, mais antigo primeiro na fila de análise e mais novo primeiro nas demais.
 * É a chave do `loader` e da tela, que por isso leem o mesmo cache.
 */
export function toQueueParams(
  search: QueueSearch,
): AdministratorListingPaginatePayload {
  return {
    status: search.status ?? DEFAULT_QUEUE_STATUS,
    page: search.page,
    search: search.q,
    perPage: QUEUE_PER_PAGE,
    sort: 'updatedAt',
  }
}
