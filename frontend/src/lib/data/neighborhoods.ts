import type { Neighborhood } from '@aporta/shared'

/**
 * Os bairros de Benjamin Constant que o filtro oferece.
 *
 * Bairro, e não mapa, é o filtro principal: nem todo endereço da cidade tem
 * geolocalização precisa, e quem procura onde morar pergunta "perto da UFAM?"
 * e "perto do porto?", não "a quantos metros?". O mapa entra como apoio.
 *
 * As coordenadas são APROXIMADAS (centro do bairro, a conferir com a
 * diretoria antes de abrir ao público): servem para posicionar o pin do mapa, e
 * um pin um quarteirão fora do lugar é aceitável num mock, mas não num dado
 * publicado. Quando a API existir, este arquivo vira `queryOptions` e o
 * contrato é `Neighborhood`.
 */
export const NEIGHBORHOODS: ReadonlyArray<Neighborhood> = [
  { slug: 'centro', name: 'Centro', lat: -4.3775, lng: -70.0312 },
  { slug: 'coaban', name: 'Coaban', lat: -4.3712, lng: -70.0265 },
  { slug: 'colonia', name: 'Colônia', lat: -4.3828, lng: -70.0368 },
  { slug: 'cidade-nova', name: 'Cidade Nova', lat: -4.3689, lng: -70.0341 },
  { slug: 'umariacu-1', name: 'Umariaçu I', lat: -4.3921, lng: -70.0214 },
  { slug: 'umariacu-2', name: 'Umariaçu II', lat: -4.3958, lng: -70.0182 },
]
