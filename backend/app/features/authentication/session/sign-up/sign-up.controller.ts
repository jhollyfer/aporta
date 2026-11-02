import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AuthenticationSessionSignUpUseCase from './sign-up.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AuthenticationSessionSignUpValidator } from '#validators/authentication/session.validator'

@inject()
export default class AuthenticationSessionSignUpController {
  static docs = defineDocs({
    description:
      'Cria a conta de um dono de imóvel que se cadastra sozinho. Responde `201` com o perfil ' +
      'da conta, no mesmo formato de `GET /account`.\n\n' +
      'O papel nasce sempre `OWNER` e **não** vem do cliente: quem escolhesse o papel ' +
      'escolheria ser administrador. A conta nasce ativa.\n\n' +
      'Não abre sessão: o cliente chama `POST /authentication/sign-in` em seguida, para que o ' +
      'par de cookies tenha uma porta só.\n\n' +
      'E-mail já usado, inclusive o de uma conta arquivada, devolve `409`.',
  })

  constructor(private readonly useCase: AuthenticationSessionSignUpUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AuthenticationSessionSignUpValidator,
    )
    const result = await this.useCase.execute(payload)

    if (result.isLeft()) throw result.value

    return context.response.created(result.value)
  }
}
