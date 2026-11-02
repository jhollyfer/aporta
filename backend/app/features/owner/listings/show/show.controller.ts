import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import OwnerListingShowUseCase from './show.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import ListingPolicy from '#policies/listing.policy'
import ListingRepository from '#repositories/listing/listing.repository'

@inject()
export default class OwnerListingShowController {
  static docs = defineDocs({
    description:
      'O anúncio do dono, em qualquer estado fora a lixeira, com o `status` e a chave do arquivo ' +
      'de cada foto.\n\n' +
      'Anúncio de outra conta responde o mesmo `404` do que não existe, nunca `403`: um `403` ' +
      'confirmaria a quem sonda que aquele uuid é um anúncio.',
    // Declared by hand because the `404` is born from the `ListingPolicy` besides the use-case.
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(
    private readonly listings: ListingRepository,
    private readonly useCase: OwnerListingShowUseCase,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })

    // The record comes from the repository contract, and the policy decides on it via
    // `ctx.bouncer` (`_standards/backend.md` §4.6); never `*OrFail`. A missing ad and someone
    // else's answer the same `404`.
    const listing = await this.listings.findById(payload.id)

    await context.bouncer.with(ListingPolicy).authorize('show', listing)

    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
