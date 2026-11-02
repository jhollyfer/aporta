import type {
  APIRequestContext,
  APIResponse,
  BrowserContextOptions,
} from '@playwright/test'

import { E2eEnv } from './env'

/** Uma conta que já entrou: o e-mail e o estado do navegador autenticado. */
export type E2eSession = {
  email: string
  storageState: Exclude<
    BrowserContextOptions['storageState'],
    string | undefined
  >
}

/**
 * Conta de dono para o E2E. Cada teste cria a própria, com e-mail único: o banco do E2E
 * não é limpo entre execuções, e um e-mail fixo daria `USER_ALREADY_EXISTS` na segunda.
 */
/**
 * Quando a janela de um limite de entrada ou de cadastro (5 por minuto por IP) esgota. A API
 * devolve `x-ratelimit-remaining` em cada resposta, e o que está acima de zero é livre; no
 * zero, a próxima chamada seria a sexta e **bloquearia por 10 minutos**, derrubando a rodada
 * inteira. Esperar o minuto virar custa 60 s uma vez; errar custa a rodada.
 */
const WINDOW_MS = 60_500
const windows = new Map<string, { remaining: number; at: number }>()

async function pace(path: string): Promise<void> {
  const last = windows.get(path)

  if (last === undefined || last.remaining > 0) return

  const wait = WINDOW_MS - (Date.now() - last.at)

  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
}

function note(path: string, response: APIResponse): void {
  const remaining = Number(response.headers()['x-ratelimit-remaining'])

  if (Number.isFinite(remaining)) {
    windows.set(path, { remaining, at: Date.now() })
  }
}

export class E2eAccount {
  /**
   * Espera a janela de entrada e de cadastro virar, para o próximo spec começar com o limite
   * cheio. O `auth.setup.ts` gasta 1 cadastro e 2 entradas, e `auth.spec.ts` precisa de 4
   * entradas pela tela: sem esta espera, o 4º reprova com 429 quando a janela do setup ainda
   * está aberta.
   */
  static async settle(): Promise<void> {
    const wait = Math.max(
      0,
      ...[...windows.values()].map(
        (last) => WINDOW_MS - (Date.now() - last.at),
      ),
    )

    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  }

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

    await pace('sign-up')
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

    note('sign-up', response)

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
  static async session(request: APIRequestContext): Promise<E2eSession> {
    const email = await E2eAccount.create(request)

    return E2eAccount.signIn(request, email, E2eAccount.password)
  }

  /**
   * Entra na conta da equipe que o seeder criou (a moderadora de exemplo). Não se cria
   * conta de equipe pela API: o cadastro público só faz `OWNER`, e a equipe nasce do seeder
   * ou do administrador. Mesmo orçamento de entrada de `session`: uma vez por worker.
   */
  static async staffSession(request: APIRequestContext): Promise<E2eSession> {
    return E2eAccount.signIn(
      request,
      E2eEnv.moderatorEmail,
      E2eEnv.ownerPassword(),
    )
  }

  private static async signIn(
    request: APIRequestContext,
    email: string,
    password: string,
  ): Promise<E2eSession> {
    await pace('sign-in')
    const response = await request.post(
      `${E2eEnv.apiUrl}/authentication/sign-in`,
      { data: { email, password } },
    )

    note('sign-in', response)

    if (response.status() !== 204) {
      throw new Error(
        `a entrada da conta ${email} no E2E respondeu ${response.status()}: ${await response.text()}`,
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
