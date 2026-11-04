# Plano de testes

**Aporta** · o que se testa, em que nível, com que critério

> Onde cada teste mora e o que cada camada leva: `_standards/architecture.md` §8; como se escreve:
> `_standards/domain.md` §10 e `_standards/backend.md` §7. Aqui fica só o que é deste projeto: os
> fluxos críticos, a matriz requisito × teste e o que conta como pronto.
>
> Estado em 2026-11-02. Verificado nesta data: `shared/` com 103 testes; backend com lint,
> typecheck, `pattern:check`, `authz:check`, `depcruise`, `validators:check` (10 pares),
> `openapi:check` (16 de 16 operações), `di:check` (28 classes) e 226 testes unitários. **No E2E do
> backend, 231 testes passam e 42 falham, todos de storage**, porque o ambiente não tem MinIO. O
> frontend foi verificado depois da ligação com a API: Vitest com 43 testes em 8 arquivos e E2E de
> navegador com 37, contra o backend semeado; `tsc`, ESLint, Prettier, build e `check-chunk-cycles`
> verdes (40 chunks, nenhum ciclo). O CI nunca rodou no GitHub.

## 1. Níveis

| Nível | Ferramenta | Onde | Roda em |
|---|---|---|---|
| Unitário do backend | Japa, suíte `unit` (`pnpm test:unit`) | `backend/app/**/*.unit.spec.ts` | pull request e push na `main` (workflow de check do backend) |
| E2E do backend | Japa, suíte `functional` (`pnpm test:e2e`), banco e MinIO reais em container | `backend/app/**/*.e2e.spec.ts` | pull request e push na `main`; localmente só com `docker compose up -d` |
| `shared/` | Vitest | `shared/src/**/*.test.ts` | pull request e push na `main` |
| Unitário do frontend | Vitest, ambiente `node` por padrão | `frontend/src/**/*.test.ts(x)` e `frontend/scripts/*.test.ts` | pull request e push na `main` |
| Guarda de ciclo de chunk | `frontend/scripts/check-chunk-cycles.mjs`, depois do build | `.output/` | pull request e push na `main` |
| E2E do frontend | Playwright (Chromium), contra o build do app e o backend reais | `frontend/e2e/*.spec.ts` | pull request e push na `main`, job "Frontend - E2E (Playwright)"; localmente `pnpm --filter ./frontend test:e2e` com `E2E_BASE_URL` e `E2E_API_URL` |

**Projetos de viewport do E2E do frontend** (`frontend/e2e/playwright.config.ts`, `_standards/frontend.md`
§11.2): `setup` (`auth.setup.ts`: cria o dono, entra como dono e como moderadora e grava as sessões em
`frontend/playwright/.auth/`, ignorado pelo git) e, dependendo dele, `mobile` (360x740, toque, base
`devices['Pixel 5']`), `tablet` (768x1024) e `desktop` (1440x900), que rodam os mesmos specs. Rodar um
por vez: `--project=mobile|tablet|desktop`; no CI cada projeto é um job com banco próprio. Localmente,
entre um projeto e outro, `delete from rate_limits` (entrada 5 por minuto e denúncia 5 por hora por
IP). Dois specs novos: `responsive.spec.ts` abre toda tela do visitante, do dono e da equipe e reprova
rolagem horizontal, texto cortado sem `truncate`/`line-clamp` e violação `serious`/`critical` do axe;
`touch-targets.spec.ts` só roda no `mobile` e reprova controle com lado menor que 44 px (exceto link no
meio de texto corrido). As listas de telas moram em `e2e/support/screens.ts`, compartilhadas com
`a11y.spec.ts`. A fixture do axe ignora o interior de `<iframe>` e mantém o próprio `<iframe>`
checado. Os specs do mapa abrem `?view=map`, porque abaixo de `lg` o mapa só aparece depois do botão
"Mapa"; `listings.spec.ts` cobre o botão (só `mobile` e `tablet`).

**E2E do frontend.** 37 testes, todos verdes contra `.output/server` e o `node ace serve` com o
catálogo semeado: `health.spec.ts` (`/health-check` do app e da API, `200`, `no-store`, e
`GET /storefront/listings` com `200`, 12 itens e `meta.total` 12), `search.spec.ts`,
`listing-detail.spec.ts`, `guide.spec.ts`, `owner-draft.spec.ts`, `locale.spec.ts`, `api-down.spec.ts`
(a API cai com a página aberta e a listagem mostra "Algo deu errado" com "Tentar de novo") e
`a11y.spec.ts` (axe sem violação `serious` ou `critical` nos dois temas, e sem rolagem horizontal em
320 px com movimento reduzido). As telas leem a API de verdade; só o `api-down.spec.ts` a derruba, com `page.route`. O fixture automático `errors` reprova `pageerror` e `console.error` da própria
origem. Os ladrilhos do OpenStreetMap são de terceiro e ficam fora dessa checagem. O job do CI com
este mesmo comando ainda não rodou no GitHub.

Comandos: `pnpm check` na raiz roda os `check` de cada pacote; `pnpm test:unit` roda os unitários.

## 2. Fluxos críticos

Os fluxos públicos do app têm spec E2E de navegador contra a API real e o catálogo semeado, e a API
pública de leitura tem E2E no backend (§3 e §3.1). Lacunas honestas: o SSR com a API fora do ar foi
conferido à mão com `curl`, e nenhum E2E o cobre, porque `page.route` só intercepta o navegador e o
`api-down.spec.ts` prova só a navegação no cliente (`TASKS.md` 8.4); a listagem com mais de 100
anúncios não tem teste, porque o catálogo semeado tem 12 (`TASKS.md` 3.9).

| Fluxo | Caminho feliz | Caminhos de erro | Teste |
|---|---|---|---|
| Procuro onde morar | home, busca, paginação, mapa pela janela, detalhe, toque no WhatsApp | filtro sem resultado, URL inválida, página fora do alcance, mais de 500 pins, 429 no mapa, anúncio inexistente (404), API fora do ar | `e2e/search.spec.ts`, `e2e/listings.spec.ts` (paginação e mapa), `e2e/headers.spec.ts` (cabeçalhos e CSP sem violação), `e2e/listing-detail.spec.ts` e `e2e/api-down.spec.ts`; a leitura da URL e a tradução em pedido à API têm unitário (§3) |
| Guia da cidade | troca de aba, WhatsApp do lugar | categoria inválida | `e2e/guide.spec.ts`; aba vazia: Lacuna, o catálogo semeado tem lugares nas quatro categorias |
| Tenho um imóvel para anunciar | seis etapas, envio, tela "em análise"; o anúncio aparece em Meus anúncios | campo inválido, sem sessão (vai ao login com o rascunho), falha nas fotos (repete só as fotos) | `e2e/owner-draft.spec.ts` e `e2e/owner-listings.spec.ts` (envio sem foto, editar, arquivar), backend `owner/listings/*` com unitário e E2E. **Sem prova:** o envio de arquivo ao bucket, que exige MinIO |
| Conta e entrada do dono | cadastro, entrada, "Minha conta", sair | e-mail repetido, senha fraca, confirmação diferente, portão sem sessão, destino externo recusado | `e2e/auth.spec.ts` e `sign-up.e2e.spec.ts` no backend (papel `OWNER` mesmo com `role` no corpo, sem cookie no cadastro); `redirect-search.test.ts` unitário. O limite de 5 por minuto é limpo em `rate_limits` antes da suíte |
| Entrada da equipe | `sign-in`, perfil, `sign-out` | credencial errada, limite de tentativas | Backend com E2E (§3.1) |
| Upload de arquivo (equipe e dono) | `POST /storages`, partes, `complete` | tipo fora da lista, tamanho divergente, assinatura falsa, arquivo de outro dono (404) | Backend com E2E, **não verificado nesta data** (sem MinIO); o 404 de arquivo alheio e o 409 de arquivo em uso foram testados sem bucket |
| Moderação e denúncia | o dono envia, a equipe recusa com motivo, o dono reenvia, a equipe aprova, o visitante denuncia, a equipe resolve | motivo curto ou longo demais, dono no painel (volta à conta), segundo arquivamento (409), excluir de vez (403 ao moderador; 409 se não está arquivado ou tem denúncia), denúncia de anúncio fora do ar (404), isca preenchida | `e2e/moderation.spec.ts` (usa a moderadora semeada e `E2E_OWNER_PASSWORD`, a mesma do seed); backend `administrator/*` e `storefront/reports/create` com unitário e E2E. Antes da suíte: `delete from rate_limits` (entrada 5 por minuto e denúncia 5 por hora por IP). Um E2E interrompido deixa um anúncio no ar e o `health.spec` vê 13 em vez de 12 |

## 3. Matriz requisito × teste

Os ids abaixo são deste plano. O título do teste começa pelo mesmo id quando o teste for escrito ou
renomeado; hoje os testes existentes não carregam o id, então a coluna "Teste" aponta o arquivo e o
caso.

| Requisito | Critério | Nível | Teste |
|---|---|---|---|
| BUS-01 | WHEN o visitante combina filtros, THE SYSTEM SHALL aplicar todos (E, não OU), no servidor | E2E (backend) | VIT-03 e VIT-04 abaixo; no frontend, `frontend/src/routes/_public/listings/-search.test.ts`: "traduz min e max para os nomes da API e pede a página inteira" |
| BUS-02 | WHEN o filtro de preço compara hotel e aluguel, THE SYSTEM SHALL tratar a diária como 30 vezes | E2E (backend) | VIT-04 abaixo: a regra saiu do frontend com `filterListings` e mora em `COALESCE(price_monthly, price_daily * 30)` |
| BUS-03 | IF a URL traz tipo, bairro ou preço inválido, THEN THE SYSTEM SHALL descartar o campo sem falhar | unitário | `frontend/src/routes/_public/listings/-search.test.ts`: "descarta tipo inválido em vez de falhar", "descarta bairro que não existe", "descarta preço negativo" |
| BUS-04 | THE SYSTEM SHALL devolver o filtro à URL e da URL ao filtro sem perda | unitário | `-search.test.ts`: "ida e volta preservam o filtro" |
| BUS-05 | THE SYSTEM SHALL pedir à API só o que filtra, sem `view` nem `selected`, para trocar de vista não refazer o `loader` | unitário | `-search.test.ts`: "não carrega o que é só da tela (vista e pin selecionado)" |
| BUS-06 | WHEN o `slug` de bairro da URL não existe, THE SYSTEM SHALL manter o valor e deixar a API devolver lista vazia | unitário | `-search.test.ts`: "mantém o slug de um bairro, e quem confere se existe é a API"; a tela vazia com "Limpar": `e2e/search.spec.ts` |
| API-01 | WHEN a API responde o `code` de recurso ausente, THE SYSTEM SHALL virar `notFound()`; qualquer outro erro, THE SYSTEM SHALL relançá-lo | unitário | `frontend/src/lib/load-or-not-found.test.ts`; o 404 dentro da casca: `e2e/listing-detail.spec.ts` |
| API-02 | THE SYSTEM SHALL montar a query só com os valores preenchidos, mantendo o zero e escapando caractere reservado | unitário | `frontend/src/lib/query-string.test.ts` |
| API-03 | WHEN a API cai com a página aberta, THE SYSTEM SHALL mostrar o erro com "Tentar de novo" | E2E | `e2e/api-down.spec.ts`; o SSR com a API fora do ar: Lacuna (`TASKS.md` 8.4) |
| CON-01 | WHEN o visitante toca em "Chamar no WhatsApp", THE SYSTEM SHALL montar `wa.me` só com dígitos e a mensagem codificada | unitário | `frontend/src/lib/whatsapp.test.ts` |
| FRE-01 | THE SYSTEM SHALL mostrar dias inteiros desde a atualização, nunca negativos | unitário | `frontend/src/lib/format.test.ts`: `daysSince` |
| SEO-01 | THE SYSTEM SHALL escapar `&` e montar URL absoluta sem barra dupla no sitemap | unitário | `frontend/src/lib/sitemap.test.ts` |
| VIT-01 | WHEN o visitante lista anúncios, THE SYSTEM SHALL devolver só os `PUBLISHED` fora da lixeira, sem `status`, `deletedAt` nem `neighborhoodId` | E2E | `backend/app/features/storefront/listings/paginate/paginate.e2e.spec.ts`: "brings only the published ones"; contrato do repository em `listing.repository.e2e.spec.ts` (Lucid e memória) |
| VIT-02 | WHEN nenhuma ordem é pedida, THE SYSTEM SHALL mostrar o mais novo primeiro | E2E | `paginate.e2e.spec.ts`: "the newest comes first" |
| VIT-03 | WHEN `type`, `neighborhood` ou `period` chegam, THE SYSTEM SHALL restringir cada um | E2E | `paginate.e2e.spec.ts`: "?type, ?neighborhood and ?period"; `listing.repository.e2e.spec.ts` |
| VIT-04 | WHEN a faixa de preço é pedida, THE SYSTEM SHALL tratar a diária como 30 vezes, com limites inclusivos, e `price` ordena pela mesma conta | E2E | `paginate.e2e.spec.ts`: "a daily-only ad counts as thirty days"; `listing.repository.e2e.spec.ts`: "sorting by price or by date" |
| VIT-05 | WHEN `search` chega, THE SYSTEM SHALL procurar em título e descrição sem sair do corte de publicados | E2E | `paginate.e2e.spec.ts`: "does not escape the published cut" |
| VIT-06 | IF `sort`, `type`, `period` ou o preço saem do permitido, THEN THE SYSTEM SHALL responder 422 apontando o campo | E2E | `paginate.e2e.spec.ts`: "?sort is outside the closed tuple", "?type, ?period or the price are invalid"; `shared/src/validators/storefront/listings.validator.test.ts` |
| VIT-07 | WHEN o anúncio está publicado, THE SYSTEM SHALL responder 200 com a forma fechada, incluindo `owner.verified` e as fotos com `url` nula | E2E | `backend/app/features/storefront/listings/show/show.e2e.spec.ts`: "answers 200 with the closed public shape" |
| VIT-08 | WHEN o anúncio é rascunho, em análise, arquivado, está na lixeira ou não existe, THE SYSTEM SHALL responder o mesmo 404 `LISTING_NOT_FOUND` | E2E | `show.e2e.spec.ts`: "answers the same 404"; `show.unit.spec.ts` |
| VIT-09 | IF o `slug` passa de 100 caracteres, THEN THE SYSTEM SHALL responder 422 | E2E | `show.e2e.spec.ts`: "the slug is longer than the column" |
| VIT-10 | THE SYSTEM SHALL manter as quatro rotas de `/storefront` só de leitura e sem exigir cookie | E2E | `backend/app/features/storefront/storefront.e2e.spec.ts` (três casos) |
| BAI-01 | WHEN o visitante lista bairros, THE SYSTEM SHALL devolver em ordem alfabética só `slug`, `name` e o centro, sem os da lixeira, e aceitar `direction` e `search` | E2E | `backend/app/features/storefront/neighborhoods/paginate/paginate.e2e.spec.ts` |
| GUI-01 | WHEN o visitante lista lugares, THE SYSTEM SHALL ordenar por nome, filtrar por `category`, trazer o dia só do evento e deixar a busca dentro da categoria | E2E | `backend/app/features/storefront/places/paginate/paginate.e2e.spec.ts` |
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
| I18N-01 | THE SYSTEM SHALL ter a mesma chave de mensagem em pt-BR, es e en | Falta | O Paraglide gera o tipo a partir do pt-BR; não há teste que compare as chaves dos três arquivos (165 em cada hoje) |
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
| `GET /health-check` (app) | 200 | `frontend/e2e/health.spec.ts` |
| `GET /storefront/listings` | 200 | `paginate.e2e.spec.ts`: "brings only the published ones" e "answers 200 with an empty page" |
| | 422 | `paginate.e2e.spec.ts`: "?sort is outside the closed tuple" |
| | 401, 403, 404 | Não se aplica: rota pública, sem sessão e sem recurso por id |
| | 429 | Não se aplica: a rota não tem limite de requisições (`SECURITY.md` TM-016) |
| `GET /storefront/listings/:slug` | 200 | `show.e2e.spec.ts`: "answers 200 with the closed public shape" |
| | 404 | `show.e2e.spec.ts`: "answers the same 404" |
| | 422 | `show.e2e.spec.ts`: "the slug is longer than the column" |
| `GET /storefront/neighborhoods` | 200 | `neighborhoods/paginate/paginate.e2e.spec.ts`: "answers 200 in alphabetical order" |
| | 422 | `neighborhoods/paginate/paginate.e2e.spec.ts`: "?sort is outside the closed tuple" |
| `GET /storefront/places` | 200 | `places/paginate/paginate.e2e.spec.ts`: "answers 200 by name" |
| | 422 | `places/paginate/paginate.e2e.spec.ts`: "?category or ?sort is outside the closed list" |
| `perPage` e `search` dos três `paginate` | tetos 100 e 100 | Lacuna: nenhum E2E manda `perPage` acima de 100 nem `search` com mais de 100 caracteres; o teto vem de `paginationFields()`, em `shared/` e no backend |
| `ListingStatus` | `PUBLISHED` | `paginate.e2e.spec.ts` e `show.e2e.spec.ts` |
| | `DRAFT` `PENDING` `ARCHIVED` | `paginate.e2e.spec.ts` e `show.e2e.spec.ts`: ficam fora da listagem e respondem 404 no detalhe |
| `ListingSortColumn` | `createdAt` `updatedAt` `price` | `listing.repository.e2e.spec.ts`: "sorting by price or by date" cobre os três; no E2E das rotas só a ordem padrão (`createdAt` decrescente) tem caso |
| `/listings`, `/listings/$slug`, `/guide`, `/list-your-place` | renderiza | `search.spec.ts`, `listing-detail.spec.ts`, `guide.spec.ts` e `owner-draft.spec.ts`, mais `a11y.spec.ts` nos dois temas |
| `UserRole` | `ADMINISTRATOR` | `role.middleware.e2e.spec.ts` |
| | `MODERATOR` | `role.middleware.e2e.spec.ts` |
| | `OWNER` | `role.middleware.e2e.spec.ts` |
| `UploadStatus` | `PENDING` | `show.e2e.spec.ts`: "still PENDING"; `delete.e2e.spec.ts` (**não verificados**) |
| | `UPLOADED` | `complete.e2e.spec.ts` (**não verificado**) |
| `ListingType` | `HOUSE` `APARTMENT` `KITNET` `ROOM` `HOTEL` | Parcial: `-search.test.ts` "aceita um tipo válido" testa um tipo e `e2e/search.spec.ts` outro; os rótulos de cada tipo são `Record` fechado e quebram a compilação se faltar um |
| `ListingPeriod` | `SEMESTER` `ACADEMIC_YEAR` `MONTHLY` `DAILY` | Parcial: o filtro por período é do backend (`paginate.e2e.spec.ts`, "?type, ?neighborhood and ?period"); sem teste por membro |
| `PhotoEnvironment` | `FACADE` `BEDROOM` `BATHROOM` `KITCHEN` `LIVING` | Lacuna: só o `Record` de rótulos fecha o conjunto |
| `PlaceCategory` | `EAT` `DRINK` `EVENT` `SERVICE` | Parcial: `places/paginate/paginate.e2e.spec.ts` testa `EVENT` e `DRINK`; `guideSearchSchema` do app sem teste |
| `Locale` | `pt-BR` `es` `en` | Backend: `detect-user-locale.middleware.e2e.spec.ts`; frontend: Lacuna |
| `LISTINGS_VIEW` | `list` `map` | Lacuna: `-search.test.ts` só prova que `view` e `selected` não vão para a API, não que o schema aceite cada valor |

Rota nova entra aqui com os status dela; valor novo de enum, com a linha dele. As rotas de
`/storefront` ficam sem 401 e 403 porque não há sessão. Cada rota de anúncio que exigir sessão (o
`POST` do dono, 3.5) entra com 200, 401, 403, 404 e 422.

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
- Fábricas em `backend/database/factories/` (`user`, `storage`, `neighborhood`, `listing`,
  `listing-photo` e `place`) e fixtures em `backend/tests/`, com o papel mínimo que o teste precisa.
- O catálogo de exemplo (`backend/database/seeders/{neighborhood,listing,place}.seed.ts`) não roda
  no ambiente `test`: o `resetDatabase()` não o recria, e cada E2E de `/storefront` cria os anúncios,
  bairros e lugares que conta (`DECISIONS.md` #11).
- O frontend não tem dado de exemplo: o E2E de navegador roda contra o backend com o catálogo semeado
  (`node ace db:seed`, 6 bairros, 12 anúncios e 10 lugares) e depende desses números (`health.spec.ts`
  confere os 12). Teste de unidade do frontend não faz rede; `vitest.config.ts` define
  `VITE_API_URL` só para os módulos que importam `env.ts` carregarem.
- Teste novo de comportamento do backend cria o próprio dado, limpa no fim e não depende de ordem.

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
