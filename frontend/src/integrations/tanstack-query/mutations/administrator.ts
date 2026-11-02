/**
 * Cada hook guarda um `mutationFn`, e só isso (`MutationProps` em `../http`). Espelham
 * `features/administrator/` do backend, com cookie: quem decide é a sessão da equipe.
 * `onSuccess`, `onError` e a invalidação são decisão da tela.
 */

import {
  AdministratorListingShowResponse,
  AdministratorOwnerVerifyResponse,
  AdministratorReportShowResponse,
} from '@aporta/shared'
import type {
  AdministratorListingReviewPayload,
  AdministratorOwnerVerifyPayload,
  AdministratorReportResolvePayload,
  Merge,
} from '@aporta/shared'
import { useMutation } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'

import { WITH_SESSION, request, requestVoid } from '../http'
import type { HTTPError, MutationProps } from '../http'

type ReviewVariables = Merge<AdministratorListingReviewPayload, { id: string }>

/** Aprova (vai ao ar) ou recusa com o motivo (volta a rascunho para o dono). */
export function useAdministratorListingReviewMutation(
  options?: MutationProps<AdministratorListingShowResponse, ReviewVariables>,
): UseMutationResult<
  AdministratorListingShowResponse,
  HTTPError,
  ReviewVariables
> {
  return useMutation<
    AdministratorListingShowResponse,
    HTTPError,
    ReviewVariables
  >({
    ...options,
    mutationFn: ({ id, ...payload }) =>
      request(
        AdministratorListingShowResponse,
        '/administrator/listings/'.concat(encodeURIComponent(id), '/review'),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
          ...WITH_SESSION,
        },
      ),
  })
}

/** Tira do ar: não há exclusão definitiva, `ARCHIVED` é a remoção. */
export function useAdministratorListingArchiveMutation(
  options?: MutationProps<void, string>,
): UseMutationResult<void, HTTPError, string> {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: (id) =>
      requestVoid('/administrator/listings/'.concat(encodeURIComponent(id)), {
        method: 'DELETE',
        ...WITH_SESSION,
      }),
  })
}

type VerifyVariables = Merge<AdministratorOwnerVerifyPayload, { id: string }>

/** O selo "dono verificado" é da conta, não do anúncio: o `id` é o de `account.id`. */
export function useAdministratorOwnerVerifyMutation(
  options?: MutationProps<AdministratorOwnerVerifyResponse, VerifyVariables>,
): UseMutationResult<
  AdministratorOwnerVerifyResponse,
  HTTPError,
  VerifyVariables
> {
  return useMutation<
    AdministratorOwnerVerifyResponse,
    HTTPError,
    VerifyVariables
  >({
    ...options,
    mutationFn: ({ id, ...payload }) =>
      request(
        AdministratorOwnerVerifyResponse,
        '/administrator/owners/'.concat(
          encodeURIComponent(id),
          '/verification',
        ),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
          ...WITH_SESSION,
        },
      ),
  })
}

type ResolveVariables = Merge<AdministratorReportResolvePayload, { id: string }>

export function useAdministratorReportResolveMutation(
  options?: MutationProps<AdministratorReportShowResponse, ResolveVariables>,
): UseMutationResult<
  AdministratorReportShowResponse,
  HTTPError,
  ResolveVariables
> {
  return useMutation<
    AdministratorReportShowResponse,
    HTTPError,
    ResolveVariables
  >({
    ...options,
    mutationFn: ({ id, ...payload }) =>
      request(
        AdministratorReportShowResponse,
        '/administrator/reports/'.concat(encodeURIComponent(id), '/resolution'),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
          ...WITH_SESSION,
        },
      ),
  })
}
