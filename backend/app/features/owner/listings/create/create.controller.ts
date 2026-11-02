import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import OwnerListingCreateUseCase from './create.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { OwnerListingCreateValidator } from '#validators/owner/listings.validator'

@inject()
export default class OwnerListingCreateController {
  static docs = defineDocs({
    description:
      'Cadastra o anúncio do dono autenticado. O anúncio **nasce `PENDING`**, aguardando a ' +
      'revisão da equipe, e nunca `PUBLISHED`: o dono não publica o próprio anúncio, e nenhum ' +
      'campo do corpo muda isso.\n\n' +
      'O dono do anúncio é a conta da sessão, nunca um campo do corpo. O nome e o WhatsApp ' +
      'que o visitante vê são os do corpo (`ownerName`, `whatsapp`), não os da conta.\n\n' +
      '`neighborhood` é o `slug` de um bairro de `GET /storefront/neighborhoods`; o pino do mapa ' +
      'usa o centro desse bairro. O endereço público (`slug`) sai do título mais um sufixo, e é ' +
      'gerado aqui.\n\n' +
      '`rules` é um texto com uma regra por linha. `bedrooms` e `bathrooms` são opcionais e, ' +
      'ausentes, valem 1. As fotos entram depois, em `POST /owner/listings/:id/photos`.',
  })

  constructor(private readonly useCase: OwnerListingCreateUseCase) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      OwnerListingCreateValidator,
    )
    const result = await this.useCase.execute({
      ...payload,
      actor: context.actor,
    })
    if (result.isLeft()) throw result.value
    return context.response.created(result.value)
  }
}
