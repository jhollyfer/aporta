import { z } from 'zod'

import { PLACE_CATEGORY } from '@aporta/shared'
import type {
  PlaceCategory,
  StorefrontPlacePaginatePayload,
} from '@aporta/shared'

import { MAX_PER_PAGE } from '#/integrations/tanstack-query/queries/storefront'

/**
 * A aba do guia na URL. Aba em `useState` some no F5 e não se compartilha, e o
 * guia existe para mandar o link a quem acabou de chegar. Valor inválido cai na
 * primeira aba (`Comer`), a pergunta mais comum de quem desembarca.
 */
export const guideSearchSchema = z.object({
  category: z
    .enum(PLACE_CATEGORY)
    .default(PLACE_CATEGORY.EAT)
    .catch(PLACE_CATEGORY.EAT),
})

export type GuideSearch = z.infer<typeof guideSearchSchema>

/**
 * O pedido de uma aba do guia. `perPage` no teto da API: o guia mostra a aba inteira
 * numa lista só, e a página padrão do servidor cortaria os lugares que passassem dela.
 * É a chave do `loader` e do componente, que por isso leem o mesmo cache.
 */
export function toPlaceParams(
  category: PlaceCategory,
): StorefrontPlacePaginatePayload {
  return { category, perPage: MAX_PER_PAGE }
}
