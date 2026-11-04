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

  /** O moderador da demonstração (`ModeratorSeeder`): `<papel>@example.com`. */
  static readonly moderatorEmail = 'moderator@example.com'

  /**
   * A senha da demonstração (`SEED_DEMO_PASSWORD` do backend sob teste), que é a de todas as
   * contas de demonstração, a do moderador entre elas. Método e não campo: só quem entra com
   * um papel que não é o dono a lê, e um campo estático faria todo spec reprovar no `import`
   * quando ela não estiver definida.
   */
  static demoPassword(): string {
    return E2eEnv.read('E2E_DEMO_PASSWORD')
  }

  /**
   * O administrador do seeder (`SEED_OWNER_EMAIL`, `SEED_OWNER_PASSWORD`): quem muda papel, suspende
   * conta e exclui anúncio de vez. Métodos e não campos pelo mesmo motivo de `demoPassword`: só os
   * specs de administrador as leem.
   */
  static administratorEmail(): string {
    return E2eEnv.read('E2E_OWNER_EMAIL')
  }

  static administratorPassword(): string {
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
