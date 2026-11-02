import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorOwnerVerifyUseCase from './verify.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import { AdministratorOwnerVerifyValidator } from '#validators/administrator/owners.validator'

@inject()
export default class AdministratorOwnerVerifyController {
  static docs = defineDocs({
    description:
      'Marca (`verified: true`) ou desmarca (`verified: false`) o selo de "dono verificado" da ' +
      'conta de quem anuncia. O selo é da **conta**: aparece em todos os anúncios dela, os de hoje ' +
      'e os que ela escrever depois, e só os anúncios antigos sem conta continuam lendo o selo da ' +
      'própria linha.\n\n' +
      'Marcar de novo mantém o instante da primeira vez. O dono perde o selo sozinho quando troca o ' +
      'nome ou o WhatsApp de contato de qualquer anúncio: o selo confirmou aquela pessoa naquele ' +
      'número. Só conta de dono (`OWNER`) é verificável.',
    errors: { 404: 'USER_NOT_FOUND', 409: 'USER_NOT_VERIFIABLE' },
  })

  constructor(private readonly useCase: AdministratorOwnerVerifyUseCase) {}

  async handle(context: HttpContext) {
    const params = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      AdministratorOwnerVerifyValidator,
    )
    const result = await this.useCase.execute({ ...payload, ...params })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
