/** Para onde um botão de ordem leva a foto: uma posição para o começo ou para o fim. */
export type PhotoMove = 'up' | 'down'

/**
 * A lista de ids com o item de `index` uma posição acima ou abaixo. Devolve `undefined`
 * quando o movimento não existe (a primeira não sobe, a última não desce, índice fora da
 * lista): quem chama desabilita o botão e nunca manda um `PUT` que não muda nada.
 *
 * Mora em `lib/` porque é a regra que a tela e o teste leem, e a tela só liga o botão a ela.
 */
export function movePhoto(
  ids: ReadonlyArray<string>,
  index: number,
  move: PhotoMove,
): string[] | undefined {
  let target = index + 1
  if (move === 'up') target = index - 1

  if (index < 0 || index >= ids.length) return undefined
  if (target < 0 || target >= ids.length) return undefined

  const next = [...ids]
  const moved = next[index]
  const other = next[target]

  if (moved === undefined || other === undefined) return undefined

  next[index] = other
  next[target] = moved

  return next
}
