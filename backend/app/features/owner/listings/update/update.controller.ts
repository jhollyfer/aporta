import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import OwnerListingUpdateUseCase from './update.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import ListingPolicy from '#policies/listing.policy'
import ListingRepository from '#repositories/listing/listing.repository'
import { OwnerListingUpdateValidator } from '#validators/owner/listings.validator'

@inject()
export default class OwnerListingUpdateController {
  static docs = defineDocs({
    description:
      'Edita o anúncio do dono. Todo campo é opcional: só o que vier no corpo muda, e campo ' +
      'ausente significa "não mexer", não "apagar".\n\n' +
      'O estado **não** muda por aqui: nem o `status`, nem o endereço público (`slug`), nem o ' +
      'dono são campos do corpo, e o que o corpo trouxer a mais é descartado. Trocar o nome ou ' +
      'o WhatsApp do contato tira o selo de dono verificado, porque a equipe confirmou uma ' +
      'pessoa por trás de um número, e um número novo é uma pessoa nova até alguém confirmar.\n\n' +
      'Trocar o bairro muda o pino do mapa para o centro do novo bairro.\n\n' +
      'Anúncio de outra conta responde o mesmo `404` do que não existe.',
    // Declared by hand because the `404` is born from the `ListingPolicy` besides the use-case.
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(
    private readonly listings: ListingRepository,
    private readonly useCase: OwnerListingUpdateUseCase,
  ) {}

  async handle(context: HttpContext) {
    const { id } = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      OwnerListingUpdateValidator,
    )

    const listing = await this.listings.findById(id)

    await context.bouncer.with(ListingPolicy).authorize('update', listing)

    const result = await this.useCase.execute({ ...payload, id })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
