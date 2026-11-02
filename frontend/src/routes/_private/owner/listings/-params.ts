import type { OwnerListingPaginatePayload } from '@aporta/shared'

import { MAX_PER_PAGE } from '#/integrations/tanstack-query/queries/storefront'

/**
 * A lista inteira numa página só, no teto da API: quem anuncia tem poucos imóveis, e a
 * paginação seria uma tela a mais para quase ninguém. Acima de 100 anúncios por conta
 * ela precisa existir.
 */
export const LISTINGS_PARAMS: OwnerListingPaginatePayload = {
  perPage: MAX_PER_PAGE,
}
