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
 * `request.cookie(COOKIE_TOKEN.ACCESS)` and has no fallback to the `Authorization`
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
      'Cadastro, entrada, saída e renovação de sessão. O par de tokens viaja em cookie `httpOnly` ' +
      'e não no corpo, então entrada, saída e renovação respondem `204` sem corpo - o que importa é o ' +
      '`Set-Cookie`. O cadastro responde `201` com o perfil e não abre sessão.',
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
      '`complete` confirma contra o objeto real. O registro nasce com o dono (quem abriu o upload): ' +
      'a equipe alcança todos os arquivos e o dono de imóvel só os que ele mesmo enviou, e o ' +
      'arquivo de outra conta responde `404` igual ao que não existe. Quem anexa guarda a referência.',
    singular: 'anexo',
    plural: 'anexos',
  },
  {
    prefix: '/owner/listings',
    name: 'Dono · Anúncios',
    description:
      'Os anúncios do dono de imóvel autenticado: cadastrar, editar, listar os próprios, ' +
      'arquivar e anexar fotos. O anúncio nasce `PENDING` e só a revisão da equipe o publica. ' +
      'O escopo é a conta da sessão, nunca um campo do corpo, e anúncio de outra conta ' +
      'responde `404` igual ao que não existe.',
    singular: 'anúncio',
    plural: 'anúncios',
  },
  {
    prefix: '/administrator/listings',
    name: 'Equipe · Anúncios',
    description:
      'A fila de revisão e a gestão de anúncios pela equipe (`ADMINISTRATOR` e `MODERATOR`). Lista ' +
      'qualquer anúncio, inclusive o arquivado, com a conta do dono; aprova (publica) ou recusa com ' +
      'motivo obrigatório, e arquiva qualquer um. Não há exclusão definitiva.',
    singular: 'anúncio',
    plural: 'anúncios',
  },
  {
    prefix: '/administrator/owners',
    name: 'Equipe · Donos',
    description:
      'O selo de "dono verificado", que é da conta de quem anuncia e aparece em todos os anúncios ' +
      'dela. Marcar e desmarcar são a mesma chamada, com `verified` verdadeiro ou falso.',
    singular: 'dono',
    plural: 'donos',
  },
  {
    prefix: '/administrator/reports',
    name: 'Equipe · Denúncias',
    description:
      'A fila de denúncias de golpe feitas na vitrine. A equipe lista por `OPEN` ou `RESOLVED` e ' +
      'fecha cada uma com uma nota; fechar não tira o anúncio do ar, isso é arquivá-lo.',
    singular: 'denúncia',
    plural: 'denúncias',
  },
  {
    prefix: '/storefront/reports',
    name: 'Vitrine · Denúncias',
    description:
      'A denúncia de golpe, **sem autenticação** e com limite por endereço. O endereço de quem ' +
      'denuncia não é guardado, só um hash com chave.',
    singular: 'denúncia',
    plural: 'denúncias',
  },
  {
    prefix: '/storefront/listings',
    name: 'Vitrine · Anúncios',
    description:
      'O catálogo de imóveis, **sem autenticação**. Só leitura, e só o que está `PUBLISHED` e fora ' +
      'da lixeira: rascunho, em análise e arquivado respondem `404` igual ao que não existe. ' +
      'O anúncio é lido pelo `slug`, e traz o contato do dono (WhatsApp) porque é para isso que ele existe.',
    singular: 'anúncio',
    plural: 'anúncios',
  },
  {
    prefix: '/storefront/neighborhoods',
    name: 'Vitrine · Bairros',
    description:
      'Os bairros de Benjamin Constant que o filtro dos anúncios oferece, **sem autenticação**. ' +
      'Cada um traz o `slug` e o centro aproximado, para o pino do mapa.',
    singular: 'bairro',
    plural: 'bairros',
  },
  {
    prefix: '/storefront/places',
    name: 'Vitrine · Guia',
    description:
      'O guia da cidade, **sem autenticação**: onde comer, onde beber, o que está acontecendo e ' +
      'os serviços úteis, por aba (`?category`).',
    singular: 'lugar',
    plural: 'lugares',
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
      '`aporta-access-token`, emitido por `POST /authentication/sign-in` e renovado por ' +
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
