/**
 * Cada hook guarda um `mutationFn`, e só isso (`MutationProps` em `../http`). Espelham
 * `features/administrator/` do backend, com cookie: quem decide é a sessão da equipe.
 * `onSuccess`, `onError` e a invalidação são decisão da tela.
 */

import {
  AdministratorListingShowResponse,
  AdministratorOwnerVerifyResponse,
  AdministratorPlaceShowResponse,
  AdministratorReportShowResponse,
  AdministratorUserShowResponse,
} from '@aporta/shared'
import type {
  AdministratorListingReviewPayload,
  AdministratorOwnerVerifyPayload,
  AdministratorPlaceWritePayload,
  AdministratorReportResolvePayload,
  AdministratorUserChangeRolePayload,
  AdministratorUserChangeStatusPayload,
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

/** Tira do ar: `ARCHIVED` é a remoção que o moderador também tem. */
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

/**
 * Exclui de vez um anúncio já arquivado e sem denúncia. Só o `ADMINISTRATOR`: a API responde
 * 403 ao moderador, e a tela só mostra o botão a quem pode (`DECISIONS.md` #34).
 */
export function useAdministratorListingDeleteMutation(
  options?: MutationProps<void, string>,
): UseMutationResult<void, HTTPError, string> {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: (id) =>
      requestVoid(
        '/administrator/listings/'.concat(encodeURIComponent(id), '/permanent'),
        {
          method: 'DELETE',
          ...WITH_SESSION,
        },
      ),
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

/** Cadastra um lugar no guia. */
export function useAdministratorPlaceCreateMutation(
  options?: MutationProps<
    AdministratorPlaceShowResponse,
    AdministratorPlaceWritePayload
  >,
): UseMutationResult<
  AdministratorPlaceShowResponse,
  HTTPError,
  AdministratorPlaceWritePayload
> {
  return useMutation<
    AdministratorPlaceShowResponse,
    HTTPError,
    AdministratorPlaceWritePayload
  >({
    ...options,
    mutationFn: (payload) =>
      request(AdministratorPlaceShowResponse, '/administrator/places', {
        method: 'POST',
        body: JSON.stringify(payload),
        ...WITH_SESSION,
      }),
  })
}

type PlaceUpdateVariables = Merge<
  AdministratorPlaceWritePayload,
  { id: string }
>

/** Edita um lugar: o `PUT` leva todos os campos, porque categoria e data dependem um do outro. */
export function useAdministratorPlaceUpdateMutation(
  options?: MutationProps<AdministratorPlaceShowResponse, PlaceUpdateVariables>,
): UseMutationResult<
  AdministratorPlaceShowResponse,
  HTTPError,
  PlaceUpdateVariables
> {
  return useMutation<
    AdministratorPlaceShowResponse,
    HTTPError,
    PlaceUpdateVariables
  >({
    ...options,
    mutationFn: ({ id, ...payload }) =>
      request(
        AdministratorPlaceShowResponse,
        '/administrator/places/'.concat(encodeURIComponent(id)),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
          ...WITH_SESSION,
        },
      ),
  })
}

/** Tira o lugar do guia (lixeira); o moderador também tem. */
export function useAdministratorPlaceArchiveMutation(
  options?: MutationProps<void, string>,
): UseMutationResult<void, HTTPError, string> {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: (id) =>
      requestVoid('/administrator/places/'.concat(encodeURIComponent(id)), {
        method: 'DELETE',
        ...WITH_SESSION,
      }),
  })
}

/** Traz um lugar arquivado de volta ao guia. */
export function useAdministratorPlaceUnarchiveMutation(
  options?: MutationProps<void, string>,
): UseMutationResult<void, HTTPError, string> {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: (id) =>
      requestVoid(
        '/administrator/places/'.concat(encodeURIComponent(id), '/unarchive'),
        {
          method: 'PUT',
          ...WITH_SESSION,
        },
      ),
  })
}

/**
 * Exclui de vez um lugar já arquivado. Só o `ADMINISTRATOR`: a API responde 403 ao
 * moderador, e a tela só mostra o botão a quem pode (`DECISIONS.md` #35).
 */
export function useAdministratorPlaceDeleteMutation(
  options?: MutationProps<void, string>,
): UseMutationResult<void, HTTPError, string> {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: (id) =>
      requestVoid(
        '/administrator/places/'.concat(encodeURIComponent(id), '/permanent'),
        {
          method: 'DELETE',
          ...WITH_SESSION,
        },
      ),
  })
}

type UserRoleVariables = Merge<
  AdministratorUserChangeRolePayload,
  { id: string }
>

/**
 * Muda o papel de uma conta. Só o `ADMINISTRATOR`: a API responde 403 aos outros, e a tela só
 * existe para ele (`DECISIONS.md` #36). As sessões da conta caem junto.
 */
export function useAdministratorUserChangeRoleMutation(
  options?: MutationProps<AdministratorUserShowResponse, UserRoleVariables>,
): UseMutationResult<
  AdministratorUserShowResponse,
  HTTPError,
  UserRoleVariables
> {
  return useMutation<
    AdministratorUserShowResponse,
    HTTPError,
    UserRoleVariables
  >({
    ...options,
    mutationFn: ({ id, ...payload }) =>
      request(
        AdministratorUserShowResponse,
        '/administrator/users/'.concat(encodeURIComponent(id), '/role'),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
          ...WITH_SESSION,
        },
      ),
  })
}

type UserStatusVariables = Merge<
  AdministratorUserChangeStatusPayload,
  { id: string }
>

/** Suspende (`INACTIVE`) ou reativa (`ACTIVE`) uma conta; suspender derruba as sessões dela. */
export function useAdministratorUserChangeStatusMutation(
  options?: MutationProps<AdministratorUserShowResponse, UserStatusVariables>,
): UseMutationResult<
  AdministratorUserShowResponse,
  HTTPError,
  UserStatusVariables
> {
  return useMutation<
    AdministratorUserShowResponse,
    HTTPError,
    UserStatusVariables
  >({
    ...options,
    mutationFn: ({ id, ...payload }) =>
      request(
        AdministratorUserShowResponse,
        '/administrator/users/'.concat(encodeURIComponent(id), '/status'),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
          ...WITH_SESSION,
        },
      ),
  })
}
