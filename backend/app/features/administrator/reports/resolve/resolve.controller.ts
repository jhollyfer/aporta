import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorReportResolveUseCase from './resolve.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { AdministratorReportResolveValidator } from '#validators/administrator/reports.validator'

@inject()
export default class AdministratorReportResolveController {
  static docs = defineDocs({
    description:
      'Fecha uma denúncia com a nota do que a equipe encontrou (de 3 a 500 caracteres). Fechar ' +
      'não mexe no anúncio: tirá-lo do ar é a ação de arquivar, separada de propósito, porque ' +
      'denúncia improcedente é resolvida sem derrubar ninguém.\n\n' +
      'A denúncia fecha uma vez só; fechar de novo responde `409` e a primeira nota fica.',
    errors: { 404: 'REPORT_NOT_FOUND' },
  })

  constructor(private readonly useCase: AdministratorReportResolveUseCase) {}

  async handle(context: HttpContext) {
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      AdministratorReportResolveValidator,
    )
    const result = await this.useCase.execute({
      ...payload,
      ...params,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
