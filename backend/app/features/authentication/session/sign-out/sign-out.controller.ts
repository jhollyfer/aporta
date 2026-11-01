import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AuthenticationSessionSignOutUseCase from './sign-out.use-case.ts'

import { defineDocs } from '#core/openapi/types'

@inject()
export default class AuthenticationSessionSignOutController {
  static docs = defineDocs({
    description:
      'Encerra a sessão **no servidor**, e não só na tela: apaga o token de acesso atual e o de ' +
      'refresh, depois limpa os dois cookies. Responde `204` sem corpo.\n\n' +
      'Token de refresh ilegível não impede a saída - os cookies são limpos de qualquer forma, ' +
      'porque o resultado que a pessoa pediu é ficar sem sessão.\n\n' +
      'Apaga só os tokens desta sessão. Derrubar **todas** é consequência de trocar e-mail ou ' +
      'senha em `PUT /account`, não desta rota.',
  })

  constructor(private readonly useCase: AuthenticationSessionSignOutUseCase) {}

  async handle(context: HttpContext) {
    const refreshToken = context.auth.use('api').refreshToken()

    // The token that authenticated this request: it is what sign-out deletes. It comes from the
    // guard, and not from the `actor`, which only carries what the rules read.
    const { currentAccessToken } = context.auth.getUserOrFail()
    let accessTokenId: string | undefined
    if (currentAccessToken)
      accessTokenId = String(currentAccessToken.identifier)

    const result = await this.useCase.execute({
      actor: context.actor,
      accessTokenId,
      refreshToken,
    })

    if (result.isLeft()) throw result.value

    context.auth.use('api').clearCookies()

    return context.response.noContent()
  }
}
