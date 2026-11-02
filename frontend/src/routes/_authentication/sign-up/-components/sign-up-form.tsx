import * as React from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'

import { AuthenticationSessionSignUpValidator } from '@aporta/shared'
import type { AuthenticationSessionSignUpPayload } from '@aporta/shared'

import { ActionButton } from '#/components/common/action-button'
import { useSessionSignUpMutation } from '#/integrations/tanstack-query/mutations/authentication'
import { m } from '#/paraglide/messages'

import { applyAuthFailure } from '../../-components/apply-auth-failure'
import { AuthCard } from '../../-components/auth-card'
import { FormNotice } from '../../-components/form-notice'
import { TextField } from '../../-components/text-field'
import { useEnterSession } from '../../-components/use-enter-session'

/**
 * Os campos que a API pode acusar. Chave de `errors` fora desta lista não some: vira a
 * mensagem geral do formulário.
 */
const FIELDS = ['name', 'email', 'password', 'passwordConfirmation'] as const

/**
 * O cadastro do dono. O sign-up responde 201 e **não abre sessão**, então o formulário
 * entra em seguida com as mesmas credenciais (`useEnterSession`) e segue para o destino:
 * quem acabou de criar a conta não deve ter que digitar tudo de novo.
 *
 * Se a conta foi criada e a entrada falhou (limite de tentativas, rede), a mensagem diz
 * as duas coisas: reenviar este formulário daria "e-mail já usado", e o caminho certo é
 * a tela de entrada, que o rodapé oferece.
 *
 * `method="post"`: um envio antes da hidratação cai no nativo, e GET poria a senha na
 * barra de endereço (CWE-598).
 */
export function SignUpForm(): React.JSX.Element {
  const form = useForm<AuthenticationSessionSignUpPayload>({
    resolver: zodResolver(AuthenticationSessionSignUpValidator),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirmation: '',
    },
    mode: 'onTouched',
  })

  const signIn = useEnterSession({
    onError: () =>
      form.setError('root', {
        type: 'server',
        message: m.auth_error_created_not_signed_in(),
      }),
  })

  const signUp = useSessionSignUpMutation({
    onError: (error) => applyAuthFailure(form, error, FIELDS),
    onSuccess: (_account, payload) =>
      signIn.mutate({ email: payload.email, password: payload.password }),
  })

  function onSubmit(payload: AuthenticationSessionSignUpPayload): void {
    form.clearErrors('root')
    signUp.mutate(payload)
  }

  return (
    <AuthCard
      title={m.auth_sign_up_title()}
      lead={m.auth_sign_up_lead()}
      footer={
        <>
          {m.auth_sign_up_to_sign_in_text()}{' '}
          <Link
            to="/sign-in"
            search={(previous) => previous}
            className="font-extrabold text-moss underline underline-offset-4"
          >
            {m.auth_sign_up_to_sign_in_link()}
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
          name="name"
          type="text"
          label={m.auth_field_name()}
          autoComplete="name"
        />
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
          hint={m.auth_field_password_hint()}
          autoComplete="new-password"
        />
        <TextField
          control={form.control}
          name="passwordConfirmation"
          type="password"
          label={m.auth_field_password_confirmation()}
          autoComplete="new-password"
        />
        <FormNotice>{form.formState.errors.root?.message}</FormNotice>
        <ActionButton
          type="submit"
          scale="lg"
          pending={signUp.isPending || signIn.isPending}
          className="w-full"
        >
          {m.auth_sign_up_submit()}
        </ActionButton>
      </form>
    </AuthCard>
  )
}
