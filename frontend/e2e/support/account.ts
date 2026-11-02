import type { APIRequestContext, BrowserContextOptions } from '@playwright/test'

import { E2eEnv } from './env'

/**
 * Conta de dono para o E2E. Cada teste cria a própria, com e-mail único: o banco do E2E
 * não é limpo entre execuções, e um e-mail fixo daria `USER_ALREADY_EXISTS` na segunda.
 */
export class E2eAccount {
  /** Atende a política de senha (`Rule.password()`: 8 a 32, maiúscula, minúscula, número e símbolo). */
  static readonly password = 'Senha@12345'

  static readonly name = 'Dono do E2E'

  static email(): string {
    const random = Math.random().toString(36).slice(2, 8)

    return `e2e-${Date.now()}-${random}@example.test`
  }

  /**
   * Cria a conta direto pela API, sem passar pela tela: o teste que só precisa de uma
   * conta existente não repete o cadastro, e o limite de cadastro da API é de 5 por
   * minuto por IP.
   */
  static async create(request: APIRequestContext): Promise<string> {
    const email = E2eAccount.email()

    const response = await request.post(
      `${E2eEnv.apiUrl}/authentication/sign-up`,
      {
        data: {
          name: E2eAccount.name,
          email,
          password: E2eAccount.password,
          passwordConfirmation: E2eAccount.password,
        },
      },
    )

    if (response.status() !== 201) {
      throw new Error(
        `o cadastro da conta do E2E respondeu ${response.status()}: ${await response.text()}`,
      )
    }

    return email
  }

  /**
   * Cria a conta e entra pela API, e devolve o estado de armazenamento do navegador já
   * autenticado: os cookies da sessão (`httpOnly`, que o JavaScript da página não cria) e a
   * dica de sessão do `localStorage`, sem a qual o app nem pergunta se há sessão.
   *
   * Existe porque o limite de entrada é de 5 por minuto por IP e estourar bloqueia por 10
   * minutos: um spec que entrasse pela tela a cada teste esgotaria o orçamento. Entra uma vez
   * por worker e cada teste abre o navegador com este estado.
   */
  static async session(request: APIRequestContext): Promise<{
    email: string
    storageState: Exclude<
      BrowserContextOptions['storageState'],
      string | undefined
    >
  }> {
    const email = await E2eAccount.create(request)

    const response = await request.post(
      `${E2eEnv.apiUrl}/authentication/sign-in`,
      { data: { email, password: E2eAccount.password } },
    )

    if (response.status() !== 204) {
      throw new Error(
        `a entrada da conta do E2E respondeu ${response.status()}: ${await response.text()}`,
      )
    }

    const { cookies } = await request.storageState()

    return {
      email,
      storageState: {
        cookies,
        origins: [
          {
            origin: new URL(E2eEnv.baseUrl).origin,
            localStorage: [{ name: 'aporta:session:v1', value: '1' }],
          },
        ],
      },
    }
  }
}
