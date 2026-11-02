import type { APIRequestContext } from '@playwright/test'

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
}
