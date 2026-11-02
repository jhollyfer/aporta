import type { APIRequestContext } from '@playwright/test'

import { StorefrontListingPaginateResponse } from '@aporta/shared'

import { E2eEnv } from './env'

/** O corpo de um anúncio válido (`OwnerListingCreateValidator`), com título único por chamada. */
export class E2eListing {
  static payload(title: string) {
    return {
      type: 'KITNET',
      furnished: true,
      neighborhood: 'centro',
      address: 'Rua do Porto, 120',
      monthly: 900,
      water: true,
      electricity: true,
      internet: false,
      periods: ['SEMESTER'],
      minimumStayMonths: 4,
      title,
      description:
        'Kitnet mobiliada, com cama, geladeira e fogão, perto do porto.',
      rules: '',
      ownerName: 'Seu Raimundo',
      whatsapp: '5597999990002',
    }
  }

  /** Cria o anúncio direto pela API, com a sessão que o contexto já carrega. Devolve o `id`. */
  static async create(
    request: APIRequestContext,
    title: string,
  ): Promise<string> {
    const response = await request.post(`${E2eEnv.apiUrl}/owner/listings`, {
      data: E2eListing.payload(title),
    })

    if (response.status() !== 201) {
      throw new Error(
        `o cadastro do anúncio do E2E respondeu ${response.status()}: ${await response.text()}`,
      )
    }

    const body: unknown = await response.json()

    if (
      typeof body !== 'object' ||
      body === null ||
      !('id' in body) ||
      typeof body.id !== 'string'
    ) {
      throw new Error('o anúncio criado não trouxe o id')
    }

    return body.id
  }

  /** Quantos anúncios a vitrine mostra agora (`meta.total` da API pública). */
  static async publishedTotal(request: APIRequestContext): Promise<number> {
    const response = await request.get(
      `${E2eEnv.apiUrl}/storefront/listings?perPage=1`,
    )

    return StorefrontListingPaginateResponse.parse(await response.json()).meta
      .total
  }

  /** A equipe aprova o anúncio (`PUT /administrator/listings/:id/review`) e ele entra na vitrine. */
  static async approve(staff: APIRequestContext, id: string): Promise<void> {
    const response = await staff.put(
      `${E2eEnv.apiUrl}/administrator/listings/${id}/review`,
      { data: { decision: 'APPROVE' } },
    )

    if (response.status() >= 300) {
      throw new Error(
        `a aprovação do anúncio do E2E respondeu ${response.status()}: ${await response.text()}`,
      )
    }
  }

  /** A equipe arquiva o anúncio (`DELETE /administrator/listings/:id`): sai da vitrine. */
  static async archive(staff: APIRequestContext, id: string): Promise<void> {
    await staff.delete(`${E2eEnv.apiUrl}/administrator/listings/${id}`)
  }

  /**
   * Publica anúncios até a vitrine ter `minimum`, e devolve os que criou, para quem chamou
   * arquivá-los no fim: o catálogo semeado tem 12, e `health.spec.ts` confere exatamente isso.
   * Sem a limpeza, a segunda rodada veria 13 e reprovaria um spec que não tem culpa.
   */
  static async crowd(
    owner: APIRequestContext,
    staff: APIRequestContext,
    minimum: number,
  ): Promise<ReadonlyArray<string>> {
    const missing = minimum - (await E2eListing.publishedTotal(owner))
    const created: Array<string> = []

    for (let index = 0; index < missing; index += 1) {
      const id = await E2eListing.create(
        owner,
        `Kitnet da paginação ${Date.now()}-${index}`,
      )

      await E2eListing.approve(staff, id)
      created.push(id)
    }

    return created
  }
}
