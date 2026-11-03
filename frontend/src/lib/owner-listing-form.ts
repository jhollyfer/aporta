import type {
  OwnerListingCreate,
  OwnerListingShowResponse,
} from '@aporta/shared'

/**
 * Os campos do formulário do dono, que são as chaves do `OwnerListingCreate`. A edição os
 * passa a `applyHTTPErrorToForm` para decidir o que é "erro de um campo" e o que é "erro
 * geral": uma chave que a API acusar e que não esteja aqui não some, vira a mensagem geral.
 */
export const OWNER_LISTING_FIELDS = [
  'type',
  'furnished',
  'neighborhood',
  'address',
  'monthly',
  'daily',
  'water',
  'electricity',
  'internet',
  'periods',
  'minimumStayMonths',
  'title',
  'description',
  'rules',
  'ownerName',
  'whatsapp',
  'bedrooms',
  'bathrooms',
] as const satisfies ReadonlyArray<keyof OwnerListingCreate>

/**
 * O anúncio como o formulário o escreve. O servidor devolve estrutura (`price.monthly`,
 * `costs.water`, `rules` como lista) e o formulário trabalha em campos soltos, com as
 * regras num texto de uma por linha: o caminho inverso do `ListingInput` do backend.
 *
 * O preço nulo vira campo ausente (`undefined`), não zero: o campo da diária vazio é
 * "sem diária", e o validator recusa 0. Por isso o retorno é parcial: um hotel que só
 * anuncia diária chega sem aluguel mensal, e o formulário o pede antes de salvar.
 */
export function listingToForm(
  listing: OwnerListingShowResponse,
): Partial<OwnerListingCreate> {
  return {
    type: listing.type,
    furnished: listing.furnished,
    neighborhood: listing.neighborhood.slug,
    address: listing.address,
    monthly: listing.price.monthly ?? undefined,
    daily: listing.price.daily ?? undefined,
    water: listing.costs.water,
    electricity: listing.costs.electricity,
    internet: listing.costs.internet,
    periods: listing.periods,
    minimumStayMonths: listing.minimumStayMonths,
    title: listing.title,
    description: listing.description,
    rules: listing.rules.join('\n'),
    ownerName: listing.owner.name,
    whatsapp: listing.owner.whatsapp,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
  }
}
