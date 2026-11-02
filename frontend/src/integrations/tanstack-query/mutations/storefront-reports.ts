import { StorefrontReportCreateResponse } from '@aporta/shared'
import type { StorefrontReportCreatePayload } from '@aporta/shared'
import { useMutation } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'

import { request } from '../http'
import type { HTTPError, MutationProps } from '../http'

/**
 * A denúncia de um anúncio, **sem sessão**: o visitante não tem conta, e por isso nem
 * `WITH_SESSION` (o navegador não manda cookie, e um 401 aqui não deve tentar `refresh`).
 * O freio é o limite por IP da rota (429 com `Retry-After`).
 */
export function useStorefrontReportCreateMutation(
  options?: MutationProps<
    StorefrontReportCreateResponse,
    StorefrontReportCreatePayload
  >,
): UseMutationResult<
  StorefrontReportCreateResponse,
  HTTPError,
  StorefrontReportCreatePayload
> {
  return useMutation<
    StorefrontReportCreateResponse,
    HTTPError,
    StorefrontReportCreatePayload
  >({
    ...options,
    mutationFn: (payload) =>
      request(StorefrontReportCreateResponse, '/storefront/reports', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  })
}
