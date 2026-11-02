import * as React from 'react'
import { useRouter } from '@tanstack/react-router'

import { NotFoundPage } from './not-found-page'

/**
 * A tela de erro de rota, com "Tentar de novo" que de fato tenta de novo.
 *
 * O `reset` do TanStack só remonta o componente; o `loader` que falhou não roda outra vez, e a
 * pessoa veria o mesmo erro para sempre. `router.invalidate()` marca os carregamentos como velhos
 * e refaz os da rota atual, e só então o `reset` tira a tela de erro.
 */
export function RouteError({
  reset,
}: {
  reset: () => void
}): React.JSX.Element {
  const router = useRouter()

  function retry() {
    void router.invalidate()
    reset()
  }

  return <NotFoundPage variant="error" onRetry={retry} />
}
