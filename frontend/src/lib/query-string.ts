/**
 * Monta a query string de uma leitura da API ignorando o que não foi preenchido.
 *
 * Descarta por `undefined` e por texto vazio, e não por falsidade: `minPrice=0` é um
 * filtro válido e não pode sumir por ser falso. Sem `?` quando não sobra nada, para
 * `/storefront/listings` e `/storefront/listings?` não virarem duas chaves de cache
 * para o mesmo pedido.
 */
export function queryString(
  params: Readonly<Record<string, string | number | undefined>>,
): string {
  const entries = Object.entries(params).flatMap(([key, value]) => {
    if (value === undefined || value === '') return []
    return [[key, String(value)]]
  })

  if (entries.length === 0) return ''

  return '?'.concat(new URLSearchParams(entries).toString())
}
