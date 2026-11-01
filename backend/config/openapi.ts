/**
 * OpenAPI document configuration.
 *
 * Only what cannot be derived from the code lives here. Route, method, path
 * parameters, authentication requirement and roles come from the router itself at
 * generation time (`scripts/openapi/emit.ts`); payload and response come from the Zod
 * schemas of `@aporta/shared` (`app/core/openapi/response.ts` points to each one). What
 * is left is the document identity and the human label of a tag.
 */

import { COOKIE_TOKEN } from '#config/session-token'

/**
 * Name of the security scheme referenced by every authenticated operation.
 *
 * It is `apiKey` in a cookie, not `bearer`: the application guard reads the token from
 * `request.cookie('access-token')` and has no fallback to the `Authorization`
 * header (`app/guards/cookie-access-tokens.guard.ts`). Documenting
 * bearer here would make Scalar's "Test Request" always fail.
 */
export const SECURITY_SCHEME = 'cookieAuth'

/** Cookie that carries the access token: the same name the guard reads. */
export const SECURITY_COOKIE = COOKIE_TOKEN.ACCESS

/**
 * Label of a group of operations in Scalar's sidebar.
 *
 * Matching is by **path** prefix, not by route name: a route name carries
 * subgroups (`.as('lifecycle')`) that would split one resource into several tags, and the
 * path does not have this problem.
 *
 * The prefixes are disjoint on purpose: a longer prefix wins by length, but a
 * parent rule next to its children would swallow them. Every registered route matches exactly
 * one rule, and the generator warns about any that matches none.
 */
export type TagRule = {
  prefix: string
  name: string
  description: string
  /**
   * The resource noun, used to build the summary of each operation:
   * `create` + `notícia` -> "Criar notícia". Writing the pair once per group
   * covers its seven operations, instead of one summary per controller.
   */
  singular?: string
  plural?: string
}

const tags: TagRule[] = [
  {
    prefix: '/authentication',
    name: 'Autenticação',
    description:
      'Entrada, saída e renovação de sessão. O par de tokens viaja em cookie `httpOnly` ' +
      'e não no corpo, então estas rotas respondem `204` sem corpo - o que importa é o `Set-Cookie`.',
    singular: 'sessão',
    plural: 'sessões',
  },
  {
    prefix: '/account',
    name: 'Conta',
    description:
      'A própria conta, seja qual for o papel. Sem identificador no caminho: o escopo vem da ' +
      'sessão, nunca do payload - quem edita é sempre quem está autenticado.',
    singular: 'conta',
    plural: 'contas',
  },
  {
    prefix: '/storages',
    name: 'Anexos',
    description:
      'Upload em três passos, porque o binário **não** atravessa esta aplicação: o ' +
      '`POST` abre e devolve URLs assinadas, o navegador sobe as partes direto no bucket, e o ' +
      '`complete` confirma contra o objeto real. O registro nasce com o dono (quem abriu o upload), que não autoriza nada - ' +
      'quem anexa guarda a referência.',
    singular: 'anexo',
    plural: 'anexos',
  },
]

const openapi = {
  info: {
    title: 'API Aporta',
    version: '1.0.0',
    description:
      'API da plataforma de moradia e guia da cidade de Benjamin Constant (AM): anúncios de ' +
      'imóveis com contato direto com o dono, lugares e eventos.\n\n' +
      'Toda rota, exceto a leitura pública, exige o cookie `httpOnly` ' +
      '`access-token`, emitido por `POST /authentication/sign-in` e renovado por ' +
      '`POST /authentication/refresh`.\n\n' +
      'Toda falha devolve o mesmo corpo: `{ message, status, code, errors? }`, onde `code` é o ' +
      'identificador de máquina e `errors` mapeia campo para mensagem quando a falha é por ' +
      'campo.',
  },

  /**
   * The variable, and not the value of `APP_SERVER_URL`: the document is generated and
   * committed, and writing the address of whoever generated it would make `--check` report
   * divergence on every machine with another `.env` (`openapi.md`,
   * fluxo-de-trabalho). Whoever serves `/openapi.json` swaps in the
   * environment address.
   */
  servers: [
    {
      url: '{APP_SERVER_URL}',
      description: 'Servidor atual',
      variables: { APP_SERVER_URL: { default: 'http://localhost:3333' } },
    },
  ],

  /** Paths that never enter the document: they are not API operations. */
  ignore: ['/documentation', '/openapi.json', '/health-check'],

  tags,
}

/**
 * A fixed summary for the action that needs a sentence other than the generic one.
 *
 * The action table in `scripts/openapi/emit.ts` is a mechanism one: `create`,
 * `paginate`, `show`, `update`, `archive`, `unarchive`, `delete` plus the
 * session and upload ones. A domain name there would become a wrong summary for the other
 * actions, and this file is the place to say what only holds for one.
 *
 * The key is the controller file name without the suffix, and the value beats
 * everything: if it is here, neither the mechanism table nor the group noun
 * is consulted.
 */
export const ACTION_OVERRIDES: Readonly<Record<string, string>> = {
  // None: all actions are mechanism ones.
}

export default openapi
