import type { APIRequestContext } from '@playwright/test'

import { E2eListing } from './listing'

/**
 * As telas de cada perfil, num lugar só: `a11y.spec.ts`, `responsive.spec.ts` e
 * `touch-targets.spec.ts` percorrem a mesma lista, e uma tela nova entra aqui e nos três.
 * `:id` vira um anúncio criado pela API para o teste.
 */
export class E2eScreens {
  /** O visitante: nenhuma sessão. */
  static readonly visitor = [
    '/',
    '/listings',
    '/listings?view=map',
    '/listings/kitnet-centro-porto',
    '/guide',
    '/list-your-place',
    '/sign-in',
    '/sign-up',
  ] as const

  /** Um anúncio que não existe: a página de 404 responde 404, então fica fora de `visitor`. */
  static readonly missing = '/listings/nao-existe'

  /** O dono logado. */
  static readonly owner = [
    '/account',
    '/owner/listings',
    '/owner/listings/:id',
  ] as const

  /** A equipe logada; o `:id` é um anúncio do dono, que a equipe abre. */
  static readonly staff = [
    '/administrator/listings',
    '/administrator/reports',
    '/administrator/listings/:id',
  ] as const

  /** Troca o `:id` por um anúncio novo do `request` (a sessão do dono). */
  static async resolve(
    request: APIRequestContext,
    path: string,
    title: string,
  ): Promise<string> {
    if (!path.includes(':id')) return path

    return path.replace(':id', await E2eListing.create(request, title))
  }
}
