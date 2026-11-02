import * as React from 'react'

import { ActionButton } from '#/components/common/action-button'
import { HTTP_STATUS } from '#/integrations/tanstack-query/http'
import type { HTTPError } from '#/integrations/tanstack-query/http'
import { m } from '#/paraglide/messages'

import { useListingMap } from './listing-map-context'

/** Sobre o mapa, no alto: o resumo do pin ocupa o rodapé, então os dois nunca se cobrem. */
const NOTICE =
  'absolute inset-x-3 top-3 z-[500] flex flex-wrap items-center justify-between gap-2 rounded-card bg-surface px-4 py-3 text-sm font-bold text-ink shadow-xl sm:inset-x-auto sm:left-3 sm:max-w-sm' // taste-skill-ignore: aviso sobre o mapa

/**
 * O que o mapa diz sobre a janela: erro (com o tempo de espera do 429), vazio, e o aviso de
 * que há mais anúncios do que ele desenha. É `role="status"` e não `alert`: a pessoa está
 * arrastando o mapa, e uma mensagem que interrompe o leitor de tela a cada arrasto atrapalha.
 * O erro, esse sim, é `alert`, porque pede uma ação.
 */
export function ListingMapStatus(): React.JSX.Element | null {
  const { pins, total, ready, error, onRetry } = useListingMap()

  if (error !== null) {
    return (
      <div role="alert" className={NOTICE}>
        <p>{errorMessage(error)}</p>
        <ActionButton tone="outline" onClick={onRetry}>
          {m.map_pins_retry()}
        </ActionButton>
      </div>
    )
  }

  if (!ready) return null

  if (pins.length === 0) {
    return (
      <p role="status" className={NOTICE}>
        {m.map_pins_empty()}
      </p>
    )
  }

  if (total > pins.length) {
    return (
      <p role="status" className={NOTICE}>
        {m.map_pins_limit({ shown: pins.length, total })}
      </p>
    )
  }

  return null
}

/** O 429 diz quando voltar; qualquer outra falha só diz que não carregou. */
function errorMessage(error: HTTPError): string {
  if (error.status !== HTTP_STATUS.TOO_MANY_REQUESTS) {
    return m.map_pins_error()
  }
  if (error.retryAfter === undefined) return m.map_pins_rate_limited()

  return m.map_pins_rate_limited_wait({ seconds: Math.ceil(error.retryAfter) })
}
