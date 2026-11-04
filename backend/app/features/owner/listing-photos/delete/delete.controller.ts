import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import OwnerListingPhotoDeleteUseCase from './delete.use-case.ts'

import { defineDocs } from '#core/openapi/types'
import ListingPolicy from '#policies/listing.policy'
import ListingRepository from '#repositories/listing/listing.repository'
import { OwnerListingPhotoDeleteValidator } from '#validators/owner/listing-photos.validator'

@inject()
export default class OwnerListingPhotoDeleteController {
  static docs = defineDocs({
    summary: 'Remover uma foto do anúncio',
    description:
      'Tira a foto da galeria; as seguintes sobem uma posição. Não muda o estado do anúncio ' +
      '(só a edição reenvia um anúncio recusado à fila).\n\n' +
      'O arquivo só sai do bucket se **nenhuma outra** foto ou conta o referenciar: uma imagem ' +
      'compartilhada com outro anúncio permanece. Se o bucket falhar, a foto continua removida ' +
      'e a varredura de arquivos órfãos termina o trabalho depois.\n\n' +
      'Foto que o anúncio não tem responde `404` `LISTING_PHOTO_NOT_FOUND`. Anúncio de outra ' +
      'conta ou arquivado responde o mesmo `404` do que não existe.',
    // Declared by hand because the `404` is born from the `ListingPolicy` besides the use-case.
    errors: { 404: 'LISTING_NOT_FOUND' },
  })

  constructor(
    private readonly listings: ListingRepository,
    private readonly useCase: OwnerListingPhotoDeleteUseCase,
  ) {}

  async handle(context: HttpContext) {
    const payload = await context.request.validateUsing(
      OwnerListingPhotoDeleteValidator,
      { data: context.params },
    )

    const listing = await this.listings.findById(payload.id)

    await context.bouncer.with(ListingPolicy).authorize('removePhoto', listing)

    const result = await this.useCase.execute(payload)
    if (result.isLeft()) throw result.value
    return context.response.noContent()
  }
}
