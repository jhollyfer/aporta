# Plano de testes

**Aporta** · o que se testa, em que nível, com que critério

> Onde cada teste mora e o que cada camada leva: `_standards/architecture.md` §8; como se escreve:
> `_standards/domain.md` §10 e `_standards/backend.md` §7. Aqui fica só o que é deste projeto: os
> fluxos críticos, a matriz requisito × teste e o que conta como pronto.
>
> Estado em 2026-11-01. Verificado nesta data: frontend (typecheck, ESLint, Vitest com 34 testes,
> Prettier, build, `check-cycles`) e `shared/` (lint, typecheck, 86 testes, build) verdes; backend
> com lint, typecheck, `pattern:check`, `authz:check`, `depcruise`, `openapi:check`, `test:unit`
> (201) e `di:check` verdes. **No E2E do backend, 176 testes passaram e 42, todos de storage,
> não foram verificados** por falta de MinIO no ambiente. O CI nunca rodou no GitHub.

## 1. Níveis

| Nível | Ferramenta | Onde | Roda em |
|---|---|---|---|
| Unitário do backend | Japa, suíte `unit` (`pnpm test:unit`) | `backend/app/**/*.unit.spec.ts` | pull request e push na `main` (workflow de check do backend) |
| E2E do backend | Japa, suíte `functional` (`pnpm test:e2e`), banco e MinIO reais em container | `backend/app/**/*.e2e.spec.ts` | pull request e push na `main`; localmente só com `docker compose up -d` |
| `shared/` | Vitest | `shared/src/**/*.test.ts` | pull request e push na `main` |
| Unitário do frontend | Vitest, ambiente `node` por padrão | `frontend/src/**/*.test.ts(x)` e `frontend/scripts/*.test.ts` | pull request e push na `main` |
| Guarda de ciclo de chunk | `frontend/scripts/check-chunk-cycles.mjs`, depois do build | `.output/` | pull request e push na `main` |
| E2E do frontend | Playwright (Chromium), contra o build do app e o backend reais | `frontend/e2e/*.spec.ts` | pull request e push na `main`, job "Frontend - E2E (Playwright)"; localmente `pnpm --filter ./frontend test:e2e` com `E2E_BASE_URL` e `E2E_API_URL` |

**E2E do frontend.** 35 testes, todos verdes localmente em 25 s contra `.output/server` e o
`node ace serve`: `health.spec.ts` (app e API, `200`, `no-store`), `search.spec.ts`,
`listing-detail.spec.ts`, `guide.spec.ts`, `owner-draft.spec.ts`, `locale.spec.ts` e `a11y.spec.ts`
(axe sem violação `serious` ou `critical` nos dois temas, e sem rolagem horizontal em 320 px com
movimento reduzido). O fixture automático `errors` reprova `pageerror` e `console.error` da própria
origem. Os ladrilhos do OpenStreetMap são de terceiro e ficam fora dessa checagem. O job do CI com
este mesmo comando ainda não rodou no GitHub.

Comandos: `pnpm check` na raiz roda os `check` de cada pacote; `pnpm test:unit` roda os unitários.

## 2. Fluxos críticos

Os fluxos públicos, que hoje rodam com dados de exemplo, têm spec E2E de navegador. Os que dependem da
API de anúncios terão o deles quando ela existir.

| Fluxo | Caminho feliz | Caminhos de erro | Teste |
|---|---|---|---|
| Procuro onde morar | home, busca, detalhe, toque no WhatsApp | filtro sem resultado, URL inválida, anúncio inexistente (404) | `e2e/search.spec.ts` e `e2e/listing-detail.spec.ts`; a lógica de filtro tem unitário (§3) |
| Guia da cidade | troca de aba, WhatsApp do lugar | categoria inválida | `e2e/guide.spec.ts` |
| Tenho um imóvel para anunciar | seis etapas, envio, confirmação | campo inválido, volta à etapa com erro, rascunho restaurado | `e2e/owner-draft.spec.ts` (erro em português, rascunho restaurado e corrompido, fluxo completo); o validator do cadastro tem unitário (§3). O envio é um stub |
| Entrada da equipe | `sign-in`, perfil, `sign-out` | credencial errada, limite de tentativas | Backend com E2E (§3.1); sem tela ainda |
| Upload de arquivo (equipe) | `POST /storages`, partes, `complete` | tipo fora da lista, tamanho divergente, assinatura falsa | Backend com E2E, **não verificado nesta data** (sem MinIO) |
| Moderação | aprovar, arquivar, verificar dono | dono de outro anúncio (404) | Falta: o domínio não existe |

## 3. Matriz requisito × teste

Os ids abaixo são deste plano. O título do teste começa pelo mesmo id quando o teste for escrito ou
renomeado; hoje os testes existentes não carregam o id, então a coluna "Teste" aponta o arquivo e o
caso.

| Requisito | Critério | Nível | Teste |
|---|---|---|---|
| BUS-01 | WHEN o visitante combina filtros, THE SYSTEM SHALL aplicar todos (E, não OU) | unitário | `frontend/src/lib/filters.test.ts`: "combina os filtros com E, não com OU" |
| BUS-02 | WHEN o filtro de preço compara hotel e aluguel, THE SYSTEM SHALL tratar a diária como 30 vezes | unitário | `filters.test.ts`: "converte a diária do hotel em 30 dias" |
| BUS-03 | IF a URL traz tipo, bairro ou preço inválido, THEN THE SYSTEM SHALL descartar o campo sem falhar | unitário | `frontend/src/routes/_public/listings/-search.test.ts`: "descarta tipo inválido em vez de falhar", "descarta bairro que não existe", "descarta preço negativo" |
| BUS-04 | THE SYSTEM SHALL devolver o filtro à URL e da URL ao filtro sem perda | unitário | `-search.test.ts`: "ida e volta preservam o filtro" |
| CON-01 | WHEN o visitante toca em "Chamar no WhatsApp", THE SYSTEM SHALL montar `wa.me` só com dígitos e a mensagem codificada | unitário | `frontend/src/lib/whatsapp.test.ts` |
| FRE-01 | THE SYSTEM SHALL mostrar dias inteiros desde a atualização, nunca negativos | unitário | `frontend/src/lib/format.test.ts`: `daysSince` |
| SEO-01 | THE SYSTEM SHALL escapar `&` e montar URL absoluta sem barra dupla no sitemap | unitário | `frontend/src/lib/sitemap.test.ts` |
| CAD-01 | IF o aluguel passa do teto, o período falta ou a descrição passa do teto, THEN THE SYSTEM SHALL recusar o cadastro | unitário (`shared/`) | `shared/src/validators/owner/listings.validator.test.ts` |
| CAD-02 | WHEN o rascunho local tem campo inválido, THE SYSTEM SHALL zerar só esse campo | unitário | Falta (`listing-draft.validator.ts` sem teste) |
| CAD-03 | THE SYSTEM SHALL aceitar no WhatsApp só dígitos | unitário (`shared/`) | Falta: o validator confere tamanho e não o conjunto de caracteres |
| AUT-01 | WHEN a credencial está certa, THE SYSTEM SHALL responder 204 com os dois cookies | E2E | `backend/app/features/authentication/session/sign-in/sign-in.e2e.spec.ts` |
| AUT-02 | IF a credencial está errada, THEN THE SYSTEM SHALL responder 401 sem revelar se o e-mail existe | E2E | `sign-in.e2e.spec.ts` |
| AUT-03 | WHEN as tentativas passam do limite, THE SYSTEM SHALL responder 429 com `Retry-After` | E2E | `sign-in.e2e.spec.ts`, `refresh.e2e.spec.ts`, `update.e2e.spec.ts` |
| AUT-04 | WHEN a senha muda, THE SYSTEM SHALL derrubar a sessão em curso | E2E | `backend/app/features/account/profile/update/update.e2e.spec.ts` |
| AUT-05 | WHEN a conta está arquivada, THE SYSTEM SHALL responder 401 mesmo com token válido | E2E | `backend/app/features/account/profile/show/show.e2e.spec.ts` |
| AUT-06 | WHEN a escrita vem de outra origem, THE SYSTEM SHALL recusá-la | E2E | `backend/app/middleware/origin.middleware.e2e.spec.ts` |
| PAP-01 | WHEN o papel é `OWNER`, THE SYSTEM SHALL responder 403 em toda rota de `/storages` | E2E | `backend/app/middleware/role.middleware.e2e.spec.ts`: "when the actor is an owner, every attachments route answers 403" |
| PAP-02 | WHEN não há sessão, THE SYSTEM SHALL responder 401, e não 403 | E2E | `role.middleware.e2e.spec.ts` |
| PAP-03 | THE SYSTEM SHALL servir a documentação da API só à equipe e responder 404 aos demais | E2E | `backend/app/features/documentation/openapi/show/show.e2e.spec.ts` |
| UPL-01 | IF o tipo do arquivo está fora da lista, o tamanho passa do teto ou a assinatura não bate com o tipo, THEN THE SYSTEM SHALL recusar | E2E | `backend/app/features/storage/files/create/create.e2e.spec.ts`, `complete/complete.e2e.spec.ts` (**não verificados nesta data**) |
| DOC-01 | THE SYSTEM SHALL manter `openapi.json` igual ao gerado das rotas | CI | `pnpm openapi:check` (verde) e `backend/app/core/openapi/openapi.e2e.spec.ts` |
| I18N-01 | THE SYSTEM SHALL ter a mesma chave de mensagem em pt-BR, es e en | Falta | O Paraglide gera o tipo a partir do pt-BR; não há teste que compare as chaves dos três arquivos (163 em cada hoje) |
| SEG-01 | THE SYSTEM SHALL manter o texto do pin do mapa só com o preço | Falta | sem teste do HTML do pin |

### 3.1 Join de cobertura

Todo conjunto enumerado vira uma linha com **cada membro escrito como token** ao lado do teste que o
prova. Membro sem teste aparece como lacuna.

| Conjunto | Membro | Teste |
|---|---|---|
| `POST /authentication/sign-in` | 204 | `sign-in.e2e.spec.ts`: "answers 204 with the two cookies" |
| | 401 | `sign-in.e2e.spec.ts`: "when the credential is wrong" |
| | 422 | Lacuna: sem caso de corpo inválido neste spec |
| | 429 | `sign-in.e2e.spec.ts`: "when the ceiling is exceeded" |
| `POST /authentication/refresh` | 200 | `refresh.e2e.spec.ts`: "renews it and returns a new token pair" |
| | 401 | `refresh.e2e.spec.ts`: "when there is no refresh cookie" |
| | 429 | `refresh.e2e.spec.ts`: "per-IP ceiling is exceeded" |
| `POST /authentication/sign-out` | 204 | `sign-out.e2e.spec.ts`: "invalidates the running session" |
| | 401 | `sign-out.e2e.spec.ts`: "refresh token is presented as access token" |
| `GET /account` | 200 | `show.e2e.spec.ts`: "answers 200 with the user itself" |
| | 401 | `show.e2e.spec.ts`: "user is archived with a still-valid token" |
| `PUT /account` | 200 | `update.e2e.spec.ts`: "payload is partial" |
| | 409 | `update.e2e.spec.ts`: "email is already used" |
| | 422 | `update.e2e.spec.ts`: "password changes without the current one" |
| | 429 | `update.e2e.spec.ts`: "past the account budget" |
| | 401 | Lacuna: coberto só pelo middleware (`auth.middleware.e2e.spec.ts`) |
| `POST /storages` | 2xx | `create.e2e.spec.ts`: "gets a single URL" (**não verificado**) |
| | 401 | `create.e2e.spec.ts`: "when there is no session" (**não verificado**) |
| | 403 | `role.middleware.e2e.spec.ts` |
| | 422 | `create.e2e.spec.ts`: "mimetype is outside the list" (**não verificado**) |
| `GET /storages` | 200 | `role.middleware.e2e.spec.ts` (moderador e administrador) |
| | 401 | `paginate.e2e.spec.ts`: "when there is no session" (**não verificado**) |
| | 403 | `role.middleware.e2e.spec.ts` |
| | 422 | `paginate.e2e.spec.ts`: "?sort is outside the closed tuple" (**não verificado**) |
| `GET /storages/:id` | 200 | `show.e2e.spec.ts` (**não verificado**) |
| | 404 | `show.e2e.spec.ts`: "id does not exist" (**não verificado**) |
| | 422 | `show.e2e.spec.ts`: "id is malformed" (**não verificado**) |
| `POST /storages/:id/complete` | 2xx | `complete.e2e.spec.ts` (**não verificado**) |
| | 422 | `complete.e2e.spec.ts`: "does not have the declared size" (**não verificado**) |
| `DELETE /storages/:id` | 204 | `delete.e2e.spec.ts` (**não verificado**) |
| | 409 | `delete.e2e.spec.ts`: "in use as an avatar" (**não verificado**) |
| | 404 | `delete.e2e.spec.ts` (**não verificado**) |
| `GET /openapi.json` | 200 | `documentation/openapi/show/show.e2e.spec.ts` |
| | 404 | `documentation/openapi/show/show.e2e.spec.ts` |
| `GET /health-check` (API) | 200 | `backend/app/features/health-check.e2e.spec.ts` |
| `GET /health-check` (app) | 200 | Lacuna: rota do app sem teste |
| `/listings`, `/listings/$slug`, `/guide`, `/list-your-place` | renderiza | Lacuna: sem teste de rota; entram no E2E da fase final |
| `UserRole` | `ADMINISTRATOR` | `role.middleware.e2e.spec.ts` |
| | `MODERATOR` | `role.middleware.e2e.spec.ts` |
| | `OWNER` | `role.middleware.e2e.spec.ts` |
| `UploadStatus` | `PENDING` | `show.e2e.spec.ts`: "still PENDING"; `delete.e2e.spec.ts` (**não verificados**) |
| | `UPLOADED` | `complete.e2e.spec.ts` (**não verificado**) |
| `ListingType` | `HOUSE` `APARTMENT` `KITNET` `ROOM` `HOTEL` | Parcial: `filters.test.ts` "filtra por tipo" testa um tipo; os rótulos de cada tipo são `Record` fechado e quebram a compilação se faltar um |
| `ListingPeriod` | `SEMESTER` `ACADEMIC_YEAR` `MONTHLY` `DAILY` | Parcial: `filters.test.ts` "filtra por período oferecido"; sem teste por membro |
| `PhotoEnvironment` | `FACADE` `BEDROOM` `BATHROOM` `KITCHEN` `LIVING` | Lacuna: só o `Record` de rótulos fecha o conjunto |
| `PlaceCategory` | `EAT` `DRINK` `EVENT` `SERVICE` | Lacuna: `guideSearchSchema` sem teste |
| `Locale` | `pt-BR` `es` `en` | Backend: `detect-user-locale.middleware.e2e.spec.ts`; frontend: Lacuna |
| `LISTINGS_VIEW` | `list` `map` | Lacuna: `-search.test.ts` não cobre `view` nem `selected` |

Rota nova entra aqui com os status dela; valor novo de enum, com a linha dele. Quando o domínio de
anúncios existir, cada rota dele entra com 200, 401, 403, 404 e 422.

## 4. Toda rota de API cobre

- [ ] Sucesso com o status certo.
- [ ] Entrada inválida → 422 com o campo.
- [ ] Sem login → 401; papel sem acesso → 403.
- [ ] Recurso de outro dono → 404, igual ao inexistente, e nada muda.
- [ ] Conflito ou estado inválido → `left(HTTPException)` com o status e o `code` certos.
- [ ] Depois de todo 4xx de escrita: a asserção de que **nada foi gravado**.

## 5. Dados de teste

- Banco: Postgres em container local na porta 5435, no banco separado `aporta_test` (criado uma vez
  com `createdb`), limpo entre testes com `truncate()`; bucket separado `aporta-test` no MinIO local
  (portas 9006 e 9007). Os dois vêm do `.env.test` versionado do backend.
- Fábricas em `backend/database/factories/` (`user.factory.ts`, `storage.factory.ts`) e fixtures em
  `backend/tests/`, com o papel mínimo que o teste precisa.
- Os dados de exemplo do frontend (`frontend/src/lib/data/`) servem às telas e a alguns testes de
  filtro; teste de comportamento cria o próprio dado e não depende dos 12 imóveis de exemplo.
- O E2E do frontend (fase final) cria o próprio dado pela API, limpa no fim e não depende de ordem.

## 6. Critério de pronto

A definição de pronto da casa (prova no `HEAD`, quatro estados por portão, atalho de teste
proibido) vale aqui sem cópia: `_standards/tooling.md` §10.1. Deste projeto:

- Teste novo falha antes da correção e passa depois.
- Cobertura: o join do §3.1 sem lacuna. Percentual mínimo: não exigido.
- Os 42 testes de storage do E2E do backend precisam passar com MinIO antes de qualquer feature que
  dependa de upload (fotos de anúncio).

## 7. Teste manual antes do release

- [ ] Busca, detalhe e WhatsApp no celular, com tema claro e escuro (o botão de WhatsApp no escuro
      tem contraste insuficiente, `DESIGN.md` §2).
- [ ] Cadastro do dono com rede lenta e com o navegador em janela privada.
- [ ] Mapa e alternância lista/mapa em tela de 360 px.
- [ ] Mesma tela em pt-BR, es e en.
- [ ] Telefones de exemplo substituídos por números reais, ou dados de exemplo fora do ar.
