import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import AdministratorPlaceCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { AdministratorPlaceWriteValidator } from '#validators/administrator/places.validator'

@inject()
export default class AdministratorPlaceCreateController {
  static docs = defineDocs({
    summary: 'Cadastrar um lugar no guia',
    description:
      'A equipe acrescenta um lugar ao guia da cidade. O bairro vai pelo `slug`; um bairro que não ' +
      'existe responde `422` apontando `neighborhood`.\n\n' +
      'Um evento (`EVENT`) precisa de `date` (`AAAA-MM-DD`) e as demais categorias não podem ter ' +
      'data. `whatsapp` é opcional: banco e feira não têm número.',
  })

  constructor(private readonly useCase: AdministratorPlaceCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      AdministratorPlaceWriteValidator,
    )
    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
