import { z } from 'zod'

import { PLACE_CATEGORY, TRASHED_MODE } from '@aporta/shared'
import type { AdministratorPlacePaginatePayload } from '@aporta/shared'

/** Quantos lugares por página: o guia semeado tem dez, e a curadoria cresce aos poucos. */
export const PLACES_PER_PAGE = 20

/**
 * O estado da lista do guia na URL: a aba (`category`), os arquivados (`archived`), a página e o
 * texto buscado (`q`, nome ou descrição, que a API procura). Quem cola o link vê a mesma lista
 * e o F5 não perde o lugar. Cada campo leva `.catch(undefined)`: endereço colado errado volta ao
 * padrão em vez de derrubar a página, e o estado padrão (todas as abas, só o que está no guia)
 * não vai à URL.
 */
export const placesSearchSchema = z.object({
  category: z.enum(PLACE_CATEGORY).optional().catch(undefined),
  archived: z.literal(true).optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
  q: z.string().trim().max(100).optional().catch(undefined),
})

export type PlacesSearch = z.infer<typeof placesSearchSchema>

/**
 * O search da URL em parâmetros da API. Sem `archived`, a API devolve só o que está no guia;
 * com ele, só a lixeira (`trashed=only`). É a chave do `loader` e da tela, que por isso leem o
 * mesmo cache.
 */
export function toPlacesParams(
  search: PlacesSearch,
): AdministratorPlacePaginatePayload {
  let trashed: AdministratorPlacePaginatePayload['trashed']
  if (search.archived === true) trashed = TRASHED_MODE.ONLY

  return {
    category: search.category,
    trashed,
    page: search.page,
    search: search.q,
    perPage: PLACES_PER_PAGE,
  }
}
