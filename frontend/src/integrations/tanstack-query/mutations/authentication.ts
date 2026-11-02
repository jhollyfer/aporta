/**
 * Cada hook guarda um `mutationFn`, e só isso (`MutationProps` em `../http`).
 * `onSuccess`, `onError` e `onSettled` são decisão da tela. As mutações espelham o
 * `features/<módulo>/` do backend.
 */

import { AccountProfileShowResponse } from '@aporta/shared'
import type {
  AuthenticationSessionSignInPayload,
  AuthenticationSessionSignUpPayload,
} from '@aporta/shared'
import { useMutation } from '@tanstack/react-query'
import type { UseMutationResult } from '@tanstack/react-query'

import { WITH_SESSION, request, requestVoid } from '../http'
import type { HTTPError, MutationProps } from '../http'

/**
 * Cria a conta de dono. Responde 201 com o perfil e **não abre sessão**: quem quer
 * entrar chama o sign-in em seguida, que é uma decisão da tela.
 */
export function useSessionSignUpMutation(
  options?: MutationProps<
    AccountProfileShowResponse,
    AuthenticationSessionSignUpPayload
  >,
): UseMutationResult<
  AccountProfileShowResponse,
  HTTPError,
  AuthenticationSessionSignUpPayload
> {
  return useMutation<
    AccountProfileShowResponse,
    HTTPError,
    AuthenticationSessionSignUpPayload
  >({
    ...options,
    mutationFn: (payload) =>
      request(AccountProfileShowResponse, '/authentication/sign-up', {
        method: 'POST',
        body: JSON.stringify(payload),
        ...WITH_SESSION,
      }),
  })
}

/**
 * Entra. Responde 204 e entrega os dois tokens em `Set-Cookie`, `httpOnly`: não há o
 * que guardar na tela, e quem passa a saber quem entrou é o `GET /account`.
 */
export function useSessionSignInMutation(
  options?: MutationProps<void, AuthenticationSessionSignInPayload>,
): UseMutationResult<void, HTTPError, AuthenticationSessionSignInPayload> {
  return useMutation<void, HTTPError, AuthenticationSessionSignInPayload>({
    ...options,
    mutationFn: (payload) =>
      requestVoid('/authentication/sign-in', {
        method: 'POST',
        body: JSON.stringify(payload),
        ...WITH_SESSION,
      }),
  })
}

/** Encerra a sessão no servidor, e não só na tela. */
export function useSessionSignOutMutation(
  options?: MutationProps<void, void>,
): UseMutationResult<void, HTTPError, void> {
  return useMutation<void, HTTPError, void>({
    ...options,
    mutationFn: () =>
      requestVoid('/authentication/sign-out', {
        method: 'POST',
        ...WITH_SESSION,
      }),
  })
}
