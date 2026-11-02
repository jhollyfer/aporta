import type { StorefrontNeighborhoodShowResponse } from '@aporta/shared'
import { useSuspenseQuery } from '@tanstack/react-query'

import { storefrontNeighborhoodsQueryOptions } from '#/integrations/tanstack-query/queries/storefront'

/**
 * Os bairros da cidade, para seletores e chips. Lê do cache que o loader do layout
 * `_public` já encheu, então não suspende de verdade nem repete o pedido. Um hook
 * só porque quatro telas precisam da mesma lista: cada uma lendo a query por conta
 * própria era o `.data.data` repetido quatro vezes.
 */
export function useNeighborhoods(): ReadonlyArray<StorefrontNeighborhoodShowResponse> {
  return useSuspenseQuery(storefrontNeighborhoodsQueryOptions()).data.data
}
