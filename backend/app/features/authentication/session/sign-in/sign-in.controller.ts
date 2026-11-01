import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AuthenticationSessionSignInUseCase from './sign-in.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AuthenticationSessionSignInValidator } from '#validators/authentication/session.validator'

@inject()
export default class AuthenticationSessionSignInController {
  static docs = defineDocs({
    description:
      'Abre a sessão. Responde `204` **sem corpo**: o que importa é o `Set-Cookie` com o par ' +
      'de tokens `httpOnly`. O cliente nunca manipula o token, e nenhum dado do ' +
      'usuário viaja dentro dele.\n\n' +
      'A falha é **indistinguível por causa**: senha errada, conta inativa e conta arquivada ' +
      'devolvem o mesmo `401`. É o que impede descobrir, pela resposta, quais e-mails existem.',
  })

  constructor(private readonly useCase: AuthenticationSessionSignInUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AuthenticationSessionSignInValidator,
    )
    const result = await this.useCase.execute(payload)

    if (result.isLeft()) throw result.value

    context.auth.use('api').issueCookies(result.value)

    return context.response.noContent()
  }
}
