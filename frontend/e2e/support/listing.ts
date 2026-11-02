import type { APIRequestContext } from '@playwright/test'

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
}
