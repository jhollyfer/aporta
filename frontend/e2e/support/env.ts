/**
 * O ambiente do E2E, lido num lugar só. Sem default: o endereço pertence a quem roda
 * (`docs/ENV.md`), e uma variável ausente para a execução dizendo qual é, em vez de
 * apontar para um endereço inventado.
 *
 * `E2E_CHROMIUM_PATH` é a única opcional: só serve a quem já tem um Chromium instalado fora do
 * cache do Playwright (um contêiner de desenvolvimento). No CI fica vazia e vale o que o
 * `playwright install` baixou.
 */
export class E2eEnv {
  /** O site (frontend) sob teste. */
  static readonly baseUrl = E2eEnv.read('E2E_BASE_URL')
  /** A API (backend), cujo `/health-check` o E2E confere. */
  static readonly apiUrl = E2eEnv.read('E2E_API_URL')
  static readonly chromiumPath = process.env['E2E_CHROMIUM_PATH']

  /** A moderadora que o seeder de desenvolvimento cria (`ModeratorSeeder`, domínio `.example`). */
  static readonly moderatorEmail = 'moderador.exemplo@aporta.example'

  /**
   * A senha do seeder (`SEED_OWNER_PASSWORD`), que é também a da moderadora de exemplo. Método
   * e não campo: só o spec de moderação a lê, e um campo estático faria todo spec reprovar no
   * `import` quando ela não estiver definida.
   */
  static ownerPassword(): string {
    return E2eEnv.read('E2E_OWNER_PASSWORD')
  }

  private static read(name: string): string {
    const value = process.env[name]

    if (!value) {
      throw new Error(
        `${name} não está definida: configure no ambiente (docs/ENV.md)`,
      )
    }

    return value
  }
}
