/**
 * Cada hook guarda um `mutationFn`, e só isso (`MutationProps` em `../http`).
 * `onSuccess`, `onError` e `onSettled` (e a invalidação) são decisão da tela. As
 * mutações espelham `features/owner/` do backend.
 *
 * Toda rota do dono pede cookie (`WITH_SESSION`): a conta do anúncio é a da sessão, e
 * nenhum corpo diz de quem ele é.
 */

import {
  OwnerListingPhotoCreateResponse,
  OwnerListingShowResponse,
} from '@aporta/shared'
import type {
  Merge,
  OwnerListingCreate,
  OwnerListingPhotoCreatePayload,
  OwnerListingUpdatePayload,
} from '@aporta/shared'
import { useMutation } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'

import { WITH_SESSION, request, requestVoid } from '../http'
import type { HTTPError, MutationProps } from '../http'

/** O anúncio novo nasce `PENDING`: o dono não o publica, a equipe revisa. */
export function useOwnerListingCreateMutation(
  options?: MutationProps<OwnerListingShowResponse, OwnerListingCreate>,
): UseMutationResult<OwnerListingShowResponse, HTTPError, OwnerListingCreate> {
  return useMutation<OwnerListingShowResponse, HTTPError, OwnerListingCreate>({
    ...options,
    mutationFn: (payload) =>
      request(OwnerListingShowResponse, '/owner/listings', {
        method: 'POST',
        body: JSON.stringify(payload),
        ...WITH_SESSION,
      }),
  })
}

type UpdateVariables = Merge<OwnerListingUpdatePayload, { id: string }>

/** `PUT`, mas parcial: campo ausente é "não mexer". O `id` vai na rota e sai do corpo. */
export function useOwnerListingUpdateMutation(
  options?: MutationProps<OwnerListingShowResponse, UpdateVariables>,
): UseMutationResult<OwnerListingShowResponse, HTTPError, UpdateVariables> {
  return useMutation<OwnerListingShowResponse, HTTPError, UpdateVariables>({
    ...options,
    mutationFn: ({ id, ...payload }) =>
      request(
        OwnerListingShowResponse,
        '/owner/listings/'.concat(encodeURIComponent(id)),
        {
          method: 'PUT',
          body: JSON.stringify(payload),
          ...WITH_SESSION,
        },
      ),
  })
}

/** Tira do ar: o servidor responde 204, o estado vira `ARCHIVED` e o anúncio vai para a lixeira. */
export function useOwnerListingArchiveMutation(
  options?: MutationProps<void, string>,
): UseMutationResult<void, HTTPError, string> {
  return useMutation<void, HTTPError, string>({
    ...options,
    mutationFn: (id) =>
      requestVoid('/owner/listings/'.concat(encodeURIComponent(id)), {
        method: 'DELETE',
        ...WITH_SESSION,
      }),
  })
}

type PhotosVariables = Merge<OwnerListingPhotoCreatePayload, { id: string }>

/**
 * Liga ao anúncio arquivos que já subiram por `/storages`: o binário não passa por aqui,
 * só a chave de cada um. A resposta é o anúncio inteiro, com as fotos em ordem.
 */
export function useOwnerListingPhotosMutation(
  options?: MutationProps<OwnerListingPhotoCreateResponse, PhotosVariables>,
): UseMutationResult<
  OwnerListingPhotoCreateResponse,
  HTTPError,
  PhotosVariables
> {
  return useMutation<
    OwnerListingPhotoCreateResponse,
    HTTPError,
    PhotosVariables
  >({
    ...options,
    mutationFn: ({ id, photos }) =>
      request(
        OwnerListingPhotoCreateResponse,
        '/owner/listings/'.concat(encodeURIComponent(id), '/photos'),
        {
          method: 'POST',
          body: JSON.stringify({ photos }),
          ...WITH_SESSION,
        },
      ),
  })
}
