import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import { AuthenticationSessionSignInValidator } from '@aporta/shared'
import type { AuthenticationSessionSignInPayload } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { m } from '#/paraglide/messages'

import { applyAuthFailure } from '../../-components/apply-auth-failure'
import { AuthCard } from '../../-components/auth-card'
import { FormNotice } from '#/components/common/form-notice'
import { TextField } from '../../-components/text-field'
import { useEnterSession } from '../../-components/use-enter-session'

/**
 * Os campos que a API pode acusar. Chave de `errors` fora desta lista não some: vira a
 * mensagem geral do formulário.
 */
const FIELDS = ['email', 'password'] as const

/**
 * A entrada do dono. `mode: 'onTouched'` valida ao sair do campo, não a cada tecla, e
 * o resolver é o validator do `@aporta/shared`, o mesmo que a API aplica
 * (_doc-lib/react-hook-form.md#docs/useform, _doc-lib/zod.md#basics).
 *
 * `method="post"`: um envio antes da hidratação cai no nativo do navegador, cujo padrão
 * é GET e poria e-mail e senha na barra de endereço. `noValidate` deixa a mensagem
 * ser a da casa, em vez do balão do navegador.
 */
export function SignInForm(): React.JSX.Element {
  const form = useForm<AuthenticationSessionSignInPayload>({
    resolver: zodResolver(AuthenticationSessionSignInValidator),
    // Sem isto os campos nascem `undefined` e o input monta sem controle para virar
    // controlado na primeira tecla.
    defaultValues: { email: '', password: '' },
    mode: 'onTouched',
  })

  const signIn = useEnterSession({
    onError: (error) => applyAuthFailure(form, error, FIELDS),
  })

  function onSubmit(payload: AuthenticationSessionSignInPayload): void {
    // Sem isto a mensagem da tentativa anterior fica na tela durante a nova.
    form.clearErrors('root')
    signIn.mutate(payload)
  }

  return (
    <AuthCard
      title={m.auth_sign_in_title()}
      lead={m.auth_sign_in_lead()}
      footer={
        <>
          {m.auth_sign_in_to_sign_up_text()}{' '}
          <Link
            to="/sign-up"
            search={(previous) => previous}
            className="font-extrabold text-moss underline underline-offset-4"
          >
            {m.auth_sign_in_to_sign_up_link()}
          </Link>
        </>
      }
    >
      <form
        method="post"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
      >
        <TextField
          control={form.control}
          name="email"
          type="email"
          label={m.auth_field_email()}
          autoComplete="email"
        />
        <TextField
          control={form.control}
          name="password"
          type="password"
          label={m.auth_field_password()}
          autoComplete="current-password"
        />
        <FormNotice>{form.formState.errors.root?.message}</FormNotice>
        <ActionButton
          type="submit"
          scale="lg"
          pending={signIn.isPending}
          className="w-full"
        >
          {m.auth_sign_in_submit()}
        </ActionButton>
      </form>
    </AuthCard>
  )
}
