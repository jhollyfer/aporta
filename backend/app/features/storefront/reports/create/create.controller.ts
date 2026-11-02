import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import StorefrontReportCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { StorefrontReportCreateValidator } from '#validators/storefront/reports.validator'

@inject()
export default class StorefrontReportCreateController {
  static docs = defineDocs({
    description:
      'Denúncia de um anúncio, **sem login**: quem foi enganado em um aluguel não vai criar conta ' +
      'para avisar. O anúncio é o `slug` que a URL carrega, e anúncio que não está no ar responde ' +
      'o mesmo `404` da leitura.\n\n' +
      '`reason` é uma de uma lista fechada e `details` é opcional, até 500 caracteres. O campo ' +
      '`website` é uma armadilha para robôs: o formulário nunca o mostra, e uma denúncia que o ' +
      'traga preenchido responde `201` como qualquer outra e não é gravada.\n\n' +
      'O endereço de quem denuncia não é guardado: só um hash com chave, para a equipe ver que ' +
      'várias denúncias vieram do mesmo lugar. Há limite de cinco denúncias por hora por endereço.',
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(private readonly useCase: StorefrontReportCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      StorefrontReportCreateValidator,
    )
    const result = await this.useCase.execute({
      ...payload,
      address: context.request.ip(),
    })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
