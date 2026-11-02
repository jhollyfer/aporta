import { notFound } from '@tanstack/react-router'

import { HTTPError } from '#/integrations/tanstack-query/http'

/**
 * O loader de detalhe com o "não encontrado" da API traduzido em `notFound()`.
 *
 * Só o `code` que a rota informa vira 404; rede fora do ar, 5xx e qualquer outro erro
 * sobem como estão. Sem isso um backend indisponível pareceria um anúncio apagado, e
 * o visitante concluiria que o imóvel saiu do ar quando foi a API que caiu. Quem
 * desenha a tela é o `notFoundComponent` da rota ou o do router.
 *
 * Por `code` e não por status 404 (a régua, `_standards/frontend.md` §5, fala em 404):
 * um `VITE_API_URL` errado também responde 404, da rota que não existe, e por status
 * isso viraria "este anúncio não existe" em vez de erro. O `code` é o que só o backend
 * emite para o recurso ausente.
 *
 * _doc-lib/tanstack-router.md#guide/not-found-errors
 * (https://tanstack.com/router/latest/docs/guide/not-found-errors).
 */
export async function loadOrNotFound<TData>(
  load: () => Promise<TData>,
  code: string,
): Promise<TData> {
  try {
    return await load()
  } catch (error) {
    if (error instanceof HTTPError && error.code === code) {
      throw notFound()
    }

    throw error
  }
}
