import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { LISTING_PHOTOS_MAX } from '@aporta/shared'

import OwnerListingPhotoReorderUseCase from './reorder.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import { IdentifierValidator } from '#core/validator'
import ListingPolicy from '#policies/listing.policy'
import ListingRepository from '#repositories/listing/listing.repository'
import { OwnerListingPhotoReorderValidator } from '#validators/owner/listing-photos.validator'

@inject()
export default class OwnerListingPhotoReorderController {
  static docs = defineDocs({
    summary: 'Reordenar as fotos do anúncio',
    description:
      'Recebe os ids das fotos do anúncio, da primeira (a capa) à última, e grava essa ordem. ' +
      'A lista tem de conter **exatamente** as fotos atuais: sem faltar, sem sobrar e sem ' +
      'repetir, senão `422` `LISTING_PHOTOS_ORDER_INVALID` e a galeria fica como estava. Esta ' +
      'rota só move fotos; anexar e remover têm as suas.\n\n' +
      `Aceita até ${LISTING_PHOTOS_MAX} ids. Não muda o estado do anúncio. Responde \`200\` com o ` +
      'anúncio inteiro, fotos na nova ordem e com a URL assinada de leitura.\n\n' +
      'Anúncio de outra conta ou arquivado responde o mesmo `404` do que não existe.',
    // Declared by hand because the `404` is born from the `ListingPolicy` besides the use-case.
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(
    private readonly listings: ListingRepository,
    private readonly useCase: OwnerListingPhotoReorderUseCase,
  ) {}

  async handle(context: HttpContext) {
    const { id } = await context.request.validateUsing(IdentifierValidator, {
      data: context.params,
    })
    const payload = await context.request.validateUsing(
      OwnerListingPhotoReorderValidator,
    )

    const listing = await this.listings.findById(id)

    await context.bouncer
      .with(ListingPolicy)
      .authorize('reorderPhotos', listing)

    const result = await this.useCase.execute({ ...payload, id })
    if (result.isLeft()) throw result.value
    return context.response.ok(result.value)
  }
}
