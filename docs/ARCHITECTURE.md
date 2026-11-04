# Arquitetura do sistema

**Aporta** · como as peças conversam

> Só o que é **deste** projeto. Camadas, árvore de pastas e nomes seguem
> `_standards/architecture.md`; aqui não se repete, se aponta.

## 1. Visão geral

Estado em 2026-11-02. O app lê anúncios, bairros e guia da API pública (`/storefront`): o servidor de
SSR chama a API na primeira navegação, e o navegador a chama direto nas navegações seguintes (por isso
a API precisa de `CORS_ORIGINS`, `ENV.md`). Não há dado de exemplo no frontend. Foto de anúncio ainda
não existe: `photos[].url` vem sempre nulo e o quadro neutro "Foto em breve" aparece no lugar.

```
Visitante (navegador) ──HTTPS──▶ Web (TanStack Start, SSR em Nitro) ──GET /storefront──▶ API (AdonisJS 7) ──▶ PostgreSQL
        │                              │            (SERVER_API_URL ou VITE_API_URL)          ▲                  │
        │                              └──── @aporta/shared ──────────────────────────────────┤                  │
        │                                    (validators Zod, enums, records, responses)      │                  │
        ├──GET /storefront (navegação no cliente, VITE_API_URL, exige CORS_ORIGINS)───────────┘                  │
        └──PUT direto das partes do upload──▶ Bucket S3 (MinIO local; S3 ou R2 em produção) ◀──────────────────┘
                                                (a API só assina as URLs)
Visitante ──▶ wa.me (WhatsApp do dono)         Visitante ──▶ tile.openstreetmap.org (mapa)
```

## 2. Stack

| Camada | Tecnologia | Versão | Doc |
|---|---|---|---|
| Linguagem | TypeScript | ~6.0 | `_standards/typescript.md` |
| Runtime | Node | >=24 (`engines`); o ambiente de desenvolvimento desta sessão tinha Node 22 | `_standards/tooling.md` |
| Monorepo | pnpm workspace: `backend/`, `frontend/`, `shared/` | pnpm ^11 (`devEngines`); o ambiente desta sessão tinha pnpm 10 | `_standards/architecture.md` §9 |
| Web | TanStack Start (React 19, Vite 8, Nitro 3 beta, preset `node-server`), Tailwind 4, TanStack Query, react-hook-form com `zodResolver`, react-leaflet com OpenStreetMap | Start ^1.168, React ^19.2, Tailwind ^4.1, Leaflet ^1.9 | `_standards/frontend.md` |
| API | AdonisJS 7 (Lucid, Bouncer, Limiter, Drive, i18n) | core ^7.6 | `_standards/backend.md` |
| Validação | Zod em `shared/` e no frontend; VineJS no backend, com paridade conferida por `validators:check` | Zod ^4, VineJS ^4.4 | `_standards/backend.md` |
| Idiomas | Paraglide no frontend (pt-BR base, es, en; estratégia `url` e depois `baseLocale`); `@adonisjs/i18n` no backend, idioma por `Accept-Language` | Paraglide ^2.13 | `_standards/i18n.md` |
| Banco | PostgreSQL + Lucid; limitador de requisições também no Postgres | Postgres 16 (compose) | `_standards/backend.md` |
| Fila | Não se aplica: não há Redis nem fila hoje; entra com o e-mail (`TASKS.md` fase 6) | | |
| Arquivos | FlyDrive e S3, upload multipart assinado | Drive ^4 | `_standards/backend.md` §5.4 |
| Deploy | Docker (`Dockerfile-production` em `backend/` e `frontend/`), imagens `aporta-api` e `aporta-app` no Docker Hub, orquestração no Coolify | | `_standards/tooling.md` §8 |

## 3. Estrutura de pastas

Segue `_standards/architecture.md` §3 (backend), §4 (frontend) e §9 (raiz e `shared/`). Só entra
aqui o que o projeto usa e a árvore deixa opcional, com motivo. Desvio da árvore não se registra
aqui: se corrige ou muda no `maiyu-pattern`.

| Pasta | Por quê |
|---|---|
| `frontend/src/components/common/` | Kit do produto, um componente por pasta com compound components onde há partes (`DESIGN.md` §7) |
| `shared/src/records/` | Tipos de registro que os dois lados leem (`Listing`, `Neighborhood`, `Place`), sem schema |
| `shared/src/validators/client/` | Validator do rascunho do cadastro, dado que nasce e fica no navegador |
| `backend/infra/minio/` e `backend/infra/r2-cors.json` | MinIO de teste local e política de CORS do bucket de produção; nunca produção em si |

## 4. Módulos (features)

Dentro de `app/features/`, o caminho é módulo, recurso e ação: o módulo é o público ou contexto, o recurso é
substantivo no plural, a ação é verbo.

| Módulo | Recursos | Ações principais | Público | Estado |
|---|---|---|---|---|
| authentication | session | sign-in, sign-out, refresh | todos os papéis | Feito |
| authentication | session | sign-up | público, cria conta `OWNER` | Feito |
| account | profile | show, update | qualquer conta autenticada | Feito |
| storage | files | create, complete, parts, show, paginate, download, delete | `ADMINISTRATOR` e `MODERATOR` (tudo) e `OWNER` (só o próprio arquivo) | Feito |
| documentation | openapi, reference | show | desenvolvedores | Feito |
| Anúncios do dono | listings | create, paginate, show, update, archive | `OWNER` | Feito |
| Anúncios do dono | listing-photos | create (liga arquivos enviados a ambientes, até 12), delete (tira uma foto; o binário só sai se nada mais o referencia), reorder (grava a ordem; tem de ser exatamente as fotos do anúncio) | `OWNER` | Feito |
| administrator | listings | paginate, show, review (aprovar e recusar com motivo), archive | `MODERATOR`, `ADMINISTRATOR` | Feito |
| administrator | listings | delete (`:id/permanent`, só o arquivado e sem denúncia) | `ADMINISTRATOR` | Feito |
| administrator | owners | verify (marcar e desmarcar) | `MODERATOR`, `ADMINISTRATOR` | Feito |
| administrator | places | paginate (com `?trashed`), show, create, update, archive, unarchive | `MODERATOR`, `ADMINISTRATOR` | Feito |
| administrator | places | delete (`:id/permanent`, só o arquivado) | `ADMINISTRATOR` | Feito |
| administrator | reports | paginate, resolve | `MODERATOR`, `ADMINISTRATOR` | Feito |
| storefront | reports | create (denúncia pública, com limite por IP) | visitante sem login | Feito |
| storefront | listings, neighborhoods, places | listings: paginate, show (por `slug`); neighborhoods e places: paginate | visitante sem login | Feito (só `GET`); o frontend a lê, ver §6 |

Raiz de `app/features/`: também `health-check.controller.ts` (`GET /health-check`). Os nomes dos
módulos novos saem da árvore da casa quando forem criados.

O grupo `storefront` não tem middleware de propósito, e só tem rota `GET` (`SECURITY.md` §2.5). Cada
recurso tem um presenter (`listings.presenter.ts`, `neighborhoods.presenter.ts`,
`places.presenter.ts`) que escolhe campo a campo o que sai. O lugar tem o formato da vitrine num
lugar só (`features/_shared.place.presenter.ts`), que o painel da equipe reaproveita e acrescenta
`archivedAt` (`administrator/places/places.presenter.ts`).

Entidades de domínio (uma pasta por entidade em `app/domain/`) e quem escreve em cada tabela: só o repository da
entidade dona (`_standards/domain.md` §5).

| Entidade | Tabela | Repository | Invariantes principais |
|---|---|---|---|
| User | `users` | `UserRepository` | e-mail único; papel entre `ADMINISTRATOR`, `MODERATOR` e `OWNER`; trocar e-mail, senha ou papel, desativar ou arquivar a conta derruba as sessões abertas; arquivamento por `deleted_at` |
| Storage | `storages` | `StorageRepository` | nasce `PENDING` e só vira `UPLOADED` no `complete`, depois de conferir tamanho e assinatura do arquivo; o backend recusa anexar o que não é `UPLOADED`; todo arquivo tem dono (`owner_id`, obrigatório) e a chave no bucket nunca vem do nome enviado |
| Sessão | `auth_access_tokens` | `SessionTokenRepository` | par de tokens opacos (acesso 1 dia, renovação 7 dias), guardados como hash |
| Limites de requisição | `rate_limits` | pelo `@adonisjs/limiter` | contagem por IP, por conta ou por usuário |
| Anúncio | `listings`, `listing_photos` | `ListingRepository` | nasce `DRAFT`; precisa de título, de ao menos um período e de preço mensal, diário ou os dois, em reais inteiros acima de zero; só `PUBLISHED` fora da lixeira chega à vitrine |
| Bairro | `neighborhoods` | `NeighborhoodRepository` | nome não vazio, centro com coordenadas válidas, `slug` único mesmo entre os arquivados |
| Lugar do guia | `places` | `PlaceRepository` | nome não vazio; só o evento (`EVENT`) tem data, o evento exige data e a data existe no calendário; arquivar o arquivado e restaurar ou apagar o que não está arquivado são recusados (`DECISIONS.md` #35) |

A foto do anúncio não é entidade: é uma posição dentro do `Listing` (`ListingPhotoProps`, com o
ambiente e sem arquivo). Os três repositories só leem: nenhum tem `save`, e a escrita entra com a
tarefa 3.5. Cada um tem implementação `lucid` e `memory`, e o teste de contrato roda nas duas
(`listing.repository.e2e.spec.ts` e os irmãos).

### 4.1 Linguagem do domínio

O código usa o nome da coluna "Nome no código", sempre o mesmo (`_standards/typescript.md` §12).

| Termo no negócio | Significado | Nome no código | Evitar |
|---|---|---|---|
| Anúncio | oferta de um imóvel ou hotel por um dono | `Listing` | "oferta", "post" |
| Dono | quem anuncia o imóvel; papel `OWNER` | `USER_ROLE.OWNER`, `ListingOwner` | "proprietário" no código, "locador" |
| Dono da plataforma | quem cria a primeira conta de administrador; nada a ver com o papel `OWNER` | `SEED_OWNER_EMAIL` | confundir com o dono do imóvel |
| Equipe | quem opera o painel: administrador e moderador | `STAFF_USER_ROLES` | "staff" na tela |
| Tipo do imóvel | casa, apartamento, kitnet, quarto ou hotel | `ListingType` (`HOUSE`, `APARTMENT`, `KITNET`, `ROOM`, `HOTEL`) | "categoria" (categoria é do guia) |
| Período | quanto tempo dura o aluguel: semestre, ano letivo, mensal ou diária | `ListingPeriod` (`SEMESTER`, `ACADEMIC_YEAR`, `MONTHLY`, `DAILY`) | "duração", "prazo" |
| Estadia mínima | meses mínimos de contrato | `minimumStayMonths` | |
| Bairro | filtro principal da busca; o mapa é apoio | `Neighborhood`, campo `neighborhood` (o `slug`) | "região", "zona" |
| Valores inclusos | se água, luz e internet já estão no aluguel | `ListingCosts` (`water`, `electricity`, `internet`) | "taxas" |
| Ambiente | cômodo que a foto mostra: fachada, quarto, banheiro, cozinha, sala | `PhotoEnvironment` (`FACADE`, `BEDROOM`, `BATHROOM`, `KITCHEN`, `LIVING`) | "categoria da foto" |
| Dono verificado | selo de que a equipe confirmou quem é o dono | `owner.verified` | "aprovado", "oficial" |
| Atualizado há X dias | idade da última atualização do anúncio, sinal de imóvel já alugado ou de golpe | `owner.updatedAt` | "publicado há" |
| Guia | conteúdo da cidade além de moradia | `Place`, `PlaceCategory` (`EAT`, `DRINK`, `EVENT`, `SERVICE`) | |
| Rascunho | cadastro do anúncio não enviado, guardado no aparelho do dono | `ClientListingDraft` | "salvo" (sugere que o servidor tem) |

## 5. Modelo de dados

Só as tabelas que existem (migrations em `backend/database/migrations/`).

| Entidade | Campos principais | Relações | Observação |
|---|---|---|---|
| `users` | id, name, email (único), password (hash), role, status (`ACTIVE` ou `INACTIVE`), avatar_id, created_at, updated_at, deleted_at | dono de `storages`; `avatar_id` aponta para `storages` | arquivamento lógico |
| `storages` | id, filename, original_name, mimetype, size, path, status, upload_id, part_size, owner_id, deleted_at | pertence a `users` (`RESTRICT`) | índice por estado e data para a varredura de uploads abandonados |
| `auth_access_tokens` | id, tokenable_id, type, name, hash, abilities, last_used_at, expires_at | pertence a `users` (`CASCADE`) | credencial viva, enviada em cookie `httpOnly` |
| `rate_limits` | chave e contagem do limitador | | |
| `neighborhoods` | id, slug (único), name, lat, lng, created_at, updated_at, deleted_at | tem muitos `listings` e `places` | coordenadas em `double precision`, para o driver entregar número; o centro é aproximado |
| `listings` | id, slug (único), status (`DRAFT`, `PENDING`, `PUBLISHED`, `ARCHIVED`; nasce `DRAFT`), type, title, description, neighborhood_id, address, price_monthly, price_daily, cost_water, cost_electricity, cost_internet, periods (`text[]`), minimum_stay_months, available_from, bedrooms, bathrooms, furnished, rules (`text[]`), owner_name, owner_whatsapp, owner_verified_at, lat, lng, created_at, updated_at, deleted_at | pertence a `neighborhoods` (`RESTRICT`); tem muitas `listing_photos` | dono denormalizado nas colunas `owner_*` (`DECISIONS.md` #10); `CHECK` exige preço mensal ou diário; índice em (`status`, `deleted_at`) e em `neighborhood_id`; arquivamento por `deleted_at` |
| `listing_photos` | id, listing_id, environment, position | pertence a `listings` (`CASCADE`); único em (`listing_id`, `position`) | sem chave para `storages` ainda: é o espaço de uma foto, e a resposta leva `url: null` |
| `places` | id, category, name, description, neighborhood_id, address, hours, whatsapp (opcional), date (só evento), created_at, updated_at, deleted_at | pertence a `neighborhoods` (`RESTRICT`) | índice em (`category`, `deleted_at`) e em `neighborhood_id` |

Migrations `1787985601500` a `1787985601530` criam as quatro tabelas novas, nesta ordem: bairros,
anúncios, fotos, lugares.

**Leitura da vitrine.** O model `Listing` tem o escopo `published` (status `PUBLISHED` e fora da
lixeira), aplicado em toda leitura de `ListingRepository`; `Neighborhood` e `Place` cortam só a
lixeira. A faixa de preço e a ordenação `price` usam
`COALESCE(price_monthly, price_daily * 30)`, com a constante `Listing.DAYS_PER_MONTH = 30` lida pelo
SQL e pela entidade. Ordenar por `price` usa `orderByRaw` com `id` de desempate, para dois anúncios
de mesmo preço não trocarem de lugar entre páginas. A busca (`search`) olha título e descrição do
anúncio, nome e descrição do lugar, e nome do bairro, sem diferenciar maiúscula.

**Dado de exemplo.** Os seeders `neighborhood`, `listing` e `place` (`environment = ['development']`)
leem `backend/database/data/` e são idempotentes: bairros e anúncios por `slug`, lugares por categoria
e nome. Entram 6 bairros, 12 anúncios, 53 fotos e 10 lugares. São a demonstração, ligada por `SEED_DEMO_PASSWORD` em qualquer ambiente, e não rodam sem ela
(`DECISIONS.md` #17). O seeder de usuário liga por `SEED_OWNER_PASSWORD`.

## 6. Fluxo de dados

**Busca pela API:** `GET /storefront/listings?type=KITNET&neighborhood=centro`
→ validator confere o filtro (422 com o campo se algo sai da lista) → use-case chama
`ListingRepository.paginatePublished` → o repository corta `PUBLISHED` fora da lixeira, aplica os
filtros e a ordem (`createdAt` decrescente se nada for pedido) → `ListingPresenter` monta cada item
campo a campo. `GET /storefront/listings/:slug` devolve o anúncio ou `404` `LISTING_NOT_FOUND`, o
mesmo para rascunho, em análise, arquivado, na lixeira e inexistente.

**Frontend para a API.** A camada mora em `frontend/src/integrations/tanstack-query/`:

- `http.ts`: `request(schema, path, init)` faz o `fetch` e valida o corpo com o schema Zod `...Response`
  do `@aporta/shared`, o mesmo do OpenAPI. Toda falha sai como `HTTPError` com `status` e `code` (rede
  fora do ar vira status 0 e `NETWORK_ERROR`; corpo fora do contrato vira `INVALID_RESPONSE`). Timeout de
  15 s, sem cookie e sem credencial: a leitura pública não tem sessão.
- `http.server.ts`: no SSR a base é `SERVER_API_URL`, quando existe, e senão `VITE_API_URL`; o navegador
  sempre usa `VITE_API_URL`.
- `query-context.ts`: um `QueryClient` por requisição, `staleTime` de 1 minuto e `retry` que no servidor
  é zero e no navegador são 2 tentativas, só para 5xx ou falha de rede.
- `queries/storefront.ts` e `hooks/tanstack-query/_query-keys.ts`: os `queryOptions` e as chaves de
  cache. `lib/query-string.ts` monta a query; `lib/load-or-not-found.ts` e `hooks/use-neighborhoods.ts`
  completam a camada.

Cada rota pré-carrega no `loader` o que a tela lê:

| Rota | Pedido | Detalhe |
|---|---|---|
| layout `_public` | bairros | alimentam a busca da home, a barra de filtros e o formulário de anunciar |
| `/` | 6 anúncios | `perPage=6`, `updatedAt` decrescente; sem anúncio, a seção "Disponíveis agora" some |
| `/listings` | anúncios filtrados | `loaderDeps` é `toListingParams(search)`, e não o search inteiro: `view` e `selected` são só da tela. `perPage=100`, o teto da API (`MAX_PER_PAGE`): o mapa mostra todos os pins, e passando de 100 anúncios publicados é preciso paginar (`TASKS.md` 3.9) |
| `/listings/$slug` | um anúncio | só `code === LISTING_NOT_FOUND` vira `notFound()`; o status 404 puro não basta, porque um `VITE_API_URL` errado também responde 404 |
| `/guide` | lugares da aba | passa `category` e `perPage=100`; a API só ordena por nome, então o evento é ordenado por data no cliente |
| `/sitemap.xml` | até 100 anúncios | `fetch` direto no servidor; se a API falhar, sai só com as páginas fixas (12 URLs, 4 por idioma) e `cache-control: no-store`; com a API de pé saem 48 URLs com os 12 anúncios semeados |

Filtro de bairro com slug que não existe passa pelo `validateSearch` (que só confere o formato), a API
devolve lista vazia e a tela mostra o estado vazio com "Limpar". A regra de faixa de preço (hotel entra
pela diária vezes 30) mora no backend, descrita acima; o frontend só mantém `EMPTY_FILTERS`,
`activeFilterCount` e o tipo `ListingFilters` em `lib/filters.ts`.

**Erro de carregamento.** Falha de API vira a tela "Algo deu errado" (`RouteError`, em
`components/common/not-found-page/`): "Tentar de novo" chama `router.invalidate()` e depois `reset()`,
para o `loader` rodar de novo, e não só remontar o componente.

**Cadastro hoje:** `/list-your-place` valida cada etapa com `OwnerListingCreateValidator` (de
`shared/`) e grava o rascunho no `localStorage` com `ClientListingDraftValidator`. O último passo,
"Finalizar cadastro", só valida o formulário inteiro e mostra "Anúncio pronto", avisando que o envio
ainda não está no ar; não há chamada à API e o rascunho não é apagado.

**Cadastro com a API** (alvo): o mesmo `OwnerListingCreateValidator` vira o validator VineJS par
no backend (paridade por `validators:check`) → `POST` de anúncio com a conta `OWNER` → use-case
confere o dono pela sessão (`actor`) → o anúncio nasce pendente de moderação → a moderação aprova
→ o anúncio aparece na busca.

**Upload de arquivo (existe, só equipe):** `POST /storages` grava a linha `PENDING` e devolve URLs
assinadas das partes (10 MiB por parte) → o navegador envia cada parte direto ao bucket e guarda o
`ETag` → `POST /storages/:id/complete` confere tamanho e assinatura e marca `UPLOADED`. O arquivo
abandonado é limpo pelo comando `node ace storages:prune` (`ARCHITECTURE.md` §9.1).

## 7. Integrações externas

| Serviço | Para quê | Contrato no código | Variáveis (`ENV.md`) |
|---|---|---|---|
| Bucket S3 (MinIO local, S3 ou R2 em produção) | fotos e arquivos dos anúncios | `StorageContract` e `MultipartContract` em `backend/app/services/storage/` e `backend/app/services/multipart/` | `STORAGE_*`, `UPLOAD_MAX_SIZE` |
| WhatsApp (`wa.me`) | contato com o dono ou com o lugar do guia; é só um link, sem API nem token | `whatsappLink` em `frontend/src/lib/whatsapp.ts` | Não se aplica |
| OpenStreetMap | ladrilhos do mapa, com a atribuição da licença | `listing-map-canvas.tsx` | Não se aplica |
| Coolify e Docker Hub | build e deploy | `.github/workflows/` | segredos e `vars` do repositório (`ENV.md` §6) |
| E-mail | confirmação de conta e aviso ao dono | Não existe ainda | a definir |

## 8. Autenticação e autorização

- Entrada por sessão de cookie: `POST /authentication/sign-in` devolve `204` e grava o par de tokens
  `httpOnly` (acesso 1 dia, renovação 7 dias); `POST /authentication/refresh` renova; `POST
  /authentication/sign-out` apaga. O cookie leva `Secure` em produção e `COOKIE_DOMAIN` quando app
  e API estão em hosts diferentes.
- Papéis (`USER_ROLE`): `ADMINISTRATOR` (nasce só do seeder, único que apaga de vez anúncio (`DELETE /administrator/listings/:id/permanent`, só o arquivado e sem denúncia, `DECISIONS.md` #34) e lugar do guia (`DELETE /administrator/places/:id/permanent`, só o arquivado, #35)), `MODERATOR`
  (revisa e arquiva anúncios, mantém o guia de lugares e arquiva lugares, sem apagar de vez nem gerir contas: `/administrator/users` é só do administrador, `DECISIONS.md` #36) e `OWNER` (dono de
  imóvel: gere só o que é seu e não opera o painel). Quem opera o painel é `STAFF_USER_ROLES`.
- Contas (`administrator/users`, #36): só `ADMINISTRATOR` lista, lê, muda o papel e suspende ou reativa (`middleware.role` no grupo da rota). A entidade `User` recusa mudar a própria conta, deixar a plataforma sem administrador ativo e tirar do papel de dono quem ainda tem anúncio fora da lixeira (409). Mudar papel ou suspender derruba as sessões; a conta suspensa não entra, não renova e o guard (`CookieAccessTokensGuard`) a barra a cada requisição.
- O grupo `/storages` exige sessão e papel de equipe: nenhuma ação de arquivo checa posse por dono
  ainda (`DECISIONS.md` #2).
- Não há cadastro: nenhuma rota cria conta hoje, e a primeira conta nasce do seeder fora de
  produção. Como a conta `OWNER` nasce é pergunta aberta (`PRD.md` §8).
- Detalhe de ameaças em `SECURITY.md`.

## 9. Ambientes

| Ambiente | URL | Onde roda | Banco | Deploy |
|---|---|---|---|---|
| Desenvolvimento | `http://localhost:3000` (app), `http://localhost:3333` (API) | máquina local, `pnpm dev` | Postgres em container na porta 5435; MinIO nas portas 9006 e 9007 | não se aplica |
| Teste (CI) | efêmero | GitHub Actions | Postgres e MinIO de serviço do job; o E2E tem um job e um banco por projeto de viewport | a cada pull request para `main`; PR só de texto pula backend e frontend (job `changes`); o Playwright roda só no PR |
| Produção | `https://aporta.maiyu.com.br` (app), `https://api-aporta.maiyu.com.br` (API) | Coolify, duas aplicações, imagens `aporta-api` e `aporta-app` | PostgreSQL de produção: Não confirmado no código; a confirmar com o dono (`MEMORY.md`) | push na `main` dispara o workflow `main.yml` (sem Playwright: o PR já o provou) |

Preview ou homologação: Não se aplica, não há.

Health check: `GET /health-check` em cada app (`_standards/architecture.md` §7).

### 9.1 O que a plataforma faz e o repositório não

Tudo que o deploy precisa e não está no código. Sem esta lista, o próximo deploy num servidor novo
quebra sem erro no log.

| O quê | Onde se configura | Por quê |
|---|---|---|
| `node ace migration:run --force` como *Post-deployment command* da aplicação da API | painel do Coolify | o `Dockerfile-production` do backend não tem `ENTRYPOINT` de propósito: subir uma réplica não é o mesmo evento que mudar o esquema |
| `COOKIE_DOMAIN=.maiyu.com.br` no serviço da API | painel do Coolify | app e API ficam em hosts diferentes; sem a variável o cookie nasce só do host da API, o SSR do app nunca o recebe e todo F5 em rota privada desloga. App e API são hosts irmãos, então `.maiyu.com.br` é o menor domínio que cobre os dois e o cookie fica visível aos outros projetos da casa (`DECISIONS.md` #9) |
| `TRUSTED_PROXIES` no serviço da API, com a rede do proxy (ex.: `loopback,uniquelocal`) | painel do Coolify | atrás do Traefik, sem ela `request.ip()` devolve o IP do proxy e os limites por IP viram um balde só; nunca `true` |
| `CORS_ORIGINS=https://aporta.maiyu.com.br` na API | painel do Coolify | fora do desenvolvimento a lista vazia recusa toda chamada de outra origem. O navegador chama `/storefront` direto nas navegações do cliente, então sem a origem do app a vitrine só aparece na primeira carga, feita pelo SSR. A barreira de `Origin` das escritas usa a mesma lista |
| Healthcheck das duas aplicações apontando para `/health-check` | painel do Coolify | o painel sobrepõe o `HEALTHCHECK` do Dockerfile; apontar o app para `/` mediria a home inteira e uma API lenta derrubaria o frontend junto |
| Portas públicas: app em 3000 e API em 3333 | painel do Coolify | são as portas que os Dockerfiles expõem e que o `HEALTHCHECK` testa |
| `VITE_API_URL` e `VITE_SITE_URL` no build do frontend; `SERVER_API_URL` opcional no serviço do app | passo de build do workflow e painel | as `VITE_*` entram no bundle em tempo de build, e `VITE_API_URL` é obrigatória: valor errado só aparece depois do deploy, como tela de erro. `SERVER_API_URL` aponta o SSR para a API pela rede interna e é lida em tempo de execução |
| Domínios `aporta.maiyu.com.br` e `api-aporta.maiyu.com.br` | painel do Coolify e DNS | o smoke test do deploy confere os dois endereços |
| CORS do bucket com `PUT`, `GET`, `HEAD` e `ETag` exposto, para a origem do app | provedor do storage, a partir de `backend/infra/r2-cors.json` | sem o `ETag` exposto o navegador não confirma as partes e o upload multipart não fecha; o arquivo não é aplicado pelo deploy. Conferir a origem: o arquivo lista `https://aporta.com.br`, e o app é `https://aporta.maiyu.com.br` |
| Bucket privado, leitura só por URL assinada curta | provedor do storage | nada é servido por URL pública |
| Varredura de uploads abandonados: agendar `node ace storages:prune` | cron do host ou tarefa agendada do Coolify | a aplicação não tem agendador; sem isso, partes de upload abandonado ficam no bucket e continuam cobradas |
| Primeira conta de administrador em produção | quem opera, por `node ace staff:create` no terminal da API | o seeder do administrador só roda se `SEED_OWNER_PASSWORD` tiver valor, e em produção ela não é definida, para não criar credencial conhecida; o comando não lê variável de ambiente e pede a senha por prompt oculto, duas vezes (`ENV.md` §8) |
| Secrets do repositório `COOLIFY_URL`, `COOLIFY_TOKEN`, `COOLIFY_API_UUID`, `COOLIFY_APP_UUID`, `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` | configurações do repositório no GitHub (Actions, Secrets) | o workflow de deploy lê só desses valores (`tooling.md` §8.3), com esses nomes fixos; `COOLIFY_URL` é a base do painel, sem caminho; os valores de URL e UUIDs ainda não foram fornecidos pelo dono |
| Segundo serviço com worker de fila | Não se aplica hoje | não há fila; passa a valer quando o e-mail entrar |

## 10. Escala e limites conhecidos

- A listagem do app é paginada (12 ou 24 por página) e o mapa pede só os pins da janela visível, até 500
  (`GET /storefront/listings/pins`, com `meta.total` para pedir zoom). O sitemap, os bairros e as abas do
  guia ainda pedem uma página de 100 e cortam o excedente acima disso.
- Os limites por IP só valem por visitante se a API enxergar o IP dele: o SSR repassa o `X-Forwarded-For`
  e `TRUSTED_PROXIES` precisa cobrir a rede do Nitro, senão o site inteiro divide 120 leituras por minuto.
- A busca por texto da API usa `ILIKE '%termo%'` em título e descrição, sem índice próprio: serve ao
  volume de uma cidade e vira varredura da tabela se o catálogo crescer muito.
- O limitador de requisições usa o Postgres: cada tentativa de login e cada passo de upload gera
  escrita no banco. Uma só instância da API e o banco comum bastam para a escala de uma cidade; mais
  réplicas funcionam porque o estado está no banco, não na memória.
- O teto de upload (`UPLOAD_MAX_SIZE`) é global e hoje vale 1 GiB no exemplo. A foto de anúncio tem
  o dela (JPEG, PNG ou WebP, 10 MB), conferido ao anexar e no seletor do formulário
  (`DECISIONS.md` #31); o binário que perde a última referência sai por `StorageOrphans`
  (`features/_shared.storage-orphans.ts`, #32).
- O mapa carrega ladrilhos públicos do OpenStreetMap, sujeitos à política de uso deles; tráfego
  alto pede um provedor próprio de ladrilhos.
