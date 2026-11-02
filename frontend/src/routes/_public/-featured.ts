import type { StorefrontListingPaginatePayload } from '@aporta/shared'

/** Quantos anúncios a home mostra: o suficiente para dar a ideia, sem virar a listagem. */
const FEATURED_COUNT = 6

/**
 * O pedido da seção "Disponíveis agora": os mais recentemente atualizados primeiro,
 * porque anúncio parado é o que o visitante teme. Mora fora de `-components/` porque
 * o `loader` da rota e a seção precisam da mesma chave de cache, e o `loader` não pode
 * importar um componente sem trazê-lo para o chunk da rota, que deve ficar enxuto.
 */
export const FEATURED_PARAMS: StorefrontListingPaginatePayload = {
  sort: 'updatedAt',
  direction: 'desc',
  perPage: FEATURED_COUNT,
}
