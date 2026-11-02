# Tarefas do projeto

**Aporta** · divididas em fases

> Roteiro do projeto. Detalhe de uma feature feita com `tlc-spec-driven` mora em
> o `tasks.md` da feature em `.specs/features/`; aqui a linha aponta para lá.
> Atualiza no mesmo commit em que a tarefa começa ou termina.

**Resumo:** 69 tarefas · 45 feitas · 0 em andamento · 4 bloqueadas · 20 a fazer, atualizado 2026-11-02

Status: `A fazer` · `Em andamento` · `Feita` · `Bloqueada` (com motivo nas notas).
Prioridade: `Alta` · `Média` · `Baixa`.

"Feita" quer dizer implementada e com a verificação possível nesta data (frontend e `shared/` verdes;
backend verde, exceto os 42 testes E2E de storage, que dependem de MinIO). O CI nunca rodou no GitHub.

## Fase 1 · Fundação do backend e do repositório (8/8)

Base genérica do backend, do `shared/` e do pipeline, sem nenhum recurso do produto ainda.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 1.1 | Workspace pnpm com `backend/`, `frontend/` e `shared/` | Alta | Feita | `DECISIONS.md` #1 |
| 1.2 | Entrada por sessão em cookie `httpOnly` (`sign-in`, `sign-out`, `refresh`) com limites de tentativa | Alta | Feita | |
| 1.3 | Conta e perfil (`GET` e `PUT /account`) | Alta | Feita | |
| 1.4 | Storage com upload multipart assinado em S3 ou MinIO | Alta | Feita | os 42 testes E2E de storage não foram verificados (sem MinIO), ver 8.3 |
| 1.5 | Papéis `ADMINISTRATOR`, `MODERATOR` e `OWNER`; `/storages` só para a equipe | Alta | Feita | `DECISIONS.md` #2 |
| 1.6 | Health-check, OpenAPI gerado e guardas (`pattern:check`, `authz:check`, `depcruise`, `validators:check`, `di:check`) | Média | Feita | |
| 1.7 | Workflows de CI, build, imagens e deploy no Coolify escritos | Alta | Feita | nunca rodaram no GitHub, ver fase 9 |
| 1.8 | Branch de trabalho no padrão `tipo/escopo-assunto` e autor único | Média | Feita | a regra é da casa (`_standards/tooling.md` §6); a lição do prefixo de agente está em `MEMORY.md` |

## Fase 2 · Frontend com dados de exemplo (9/9)

Telas públicas completas. Nesta fase liam `frontend/src/lib/data` em vez da API; a 3.6 trocou essa fonte pela API e a pasta saiu.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 2.1 | Casca pública, tema claro e escuro, três idiomas (165 mensagens por idioma) | Alta | Feita | |
| 2.2 | Home: busca em pílula, categorias por tipo, destaques, confiança, guia e faixa do dono | Alta | Feita | |
| 2.3 | Listagem: filtros na URL, chips, mapa com preço no pin, alternância lista/mapa no celular | Alta | Feita | `DECISIONS.md` #5 |
| 2.4 | Detalhe do imóvel: galeria por ambiente, valores, dono e WhatsApp fixo no celular | Alta | Feita | |
| 2.5 | Guia com quatro abas na URL | Média | Feita | |
| 2.6 | Cadastro do dono em seis etapas com progresso e rascunho local | Alta | Feita | o último passo envia o anúncio e as fotos (PR D) |
| 2.7 | Cenas SVG por ambiente no lugar de fotos | Média | Feita | `DECISIONS.md` #6 |
| 2.8 | `sitemap.xml`, `robots.txt`, `/health-check` e `head` por rota | Média | Feita | |
| 2.9 | Dados de exemplo: 12 imóveis, 10 lugares e 6 bairros | Média | Feita | telefones fictícios (`5597999990`) e coordenadas aproximadas, ver 7.10; hoje moram em `backend/database/data/` e chegam ao app pela API |

## Fase 3 · Domínio de anúncios no backend (9/9)

A leitura pública entrou (commits `44f5ebe` e `4692ac0`): quatro rotas `GET` em `/storefront`, sem
escrita. O frontend passou a lê-la (3.6, branch `feat/frontend-vitrine-api`). Falta o `POST` do dono e a
paginação da listagem. Parte dos tipos `Listing`, `Neighborhood` e `Place` de `shared/src/records/`.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 3.1 | Entidade de anúncio, migration e repository (valores, inclusos, períodos, dono) | Alta | Feita | só leitura: o contrato `ListingRepository` não tem `save`, e a escrita entra com 3.5; dono denormalizado em `listings` (`DECISIONS.md` #10) |
| 3.2 | Bairros como dado (tabela e consulta pública) | Alta | Feita | `GET /storefront/neighborhoods`; a lista e as coordenadas ainda precisam de conferência com quem conhece a cidade (7.10) |
| 3.3 | Vitrine pública: listar com filtro e paginação, mostrar por `slug` | Alta | Feita | `GET /storefront/listings` e `GET /storefront/listings/:slug`; `ARCHITECTURE.md` §4 |
| 3.4 | Lugares do guia (categoria, evento com data) | Média | Feita | `GET /storefront/places`, filtro `category`; só o evento tem `date` |
| 3.5 | Validator VineJS par do `OwnerListingCreateValidator` e criação do anúncio pelo dono | Alta | Feita | `owner/listings/{create,paginate,show,update,archive}`; nasce `PENDING`; posse por `listing.policy.ts` (404 para anúncio alheio) |
| 3.6 | Trocar `lib/data` por `queryOptions` nas rotas, com estados de carregando e erro | Alta | Feita | `frontend/src/lib/data` saiu; a camada está em `frontend/src/integrations/tanstack-query/` (`ARCHITECTURE.md` §6); `VITE_API_URL` é obrigatória (`ENV.md`); a API não devolve URL de foto, então a cena SVG continua. Verificado: Vitest 43 testes, E2E de navegador 37 contra o backend semeado, build e `check-chunk-cycles` verdes. Falta o CI no GitHub (9.3) e a imagem Docker, que não foi construída |
| 3.7 | Responses de listagem em `shared/src/responses/` e documento OpenAPI | Média | Feita | `shared/src/responses/storefront/`; `openapi:check` com 16 de 16 operações; a response do `POST` do dono entra com 3.5 |
| 3.8 | E2E do backend e linha na matriz do `TEST-PLAN.md` para cada rota nova | Alta | Feita | as quatro rotas de `/storefront`, `TEST-PLAN.md` §3 e §3.1; o `POST` do dono leva as linhas dele |
| 3.9 | Paginar a listagem e o mapa: hoje `/listings` pede `perPage=100` (o teto da API, `MAX_PER_PAGE`) e mostra todos os pins de uma vez; passando de 100 anúncios publicados os pins e os cards cobrem só os 100 primeiros, e o sitemap, os bairros e as abas do guia têm o mesmo corte | Média | Feita | listagem paginada (12 ou 24 por página, `page` na URL) e mapa pela janela visível em `GET /storefront/listings/pins`, com teto de 500 e aviso para aproximar; sitemap, bairros e abas do guia ainda cortam em 100 (`ARCHITECTURE.md` §10) |

## Fase 4 · Fotos dos anúncios (3/5)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 4.1 | Policy de posse por dono nas ações de `/storages` e só então abrir o grupo ao `OWNER` | Alta | Feita | `StoragePolicy`: equipe vê tudo, `OWNER` só o próprio arquivo, o resto é 404; as variantes de upload do `OWNER` não foram provadas (sem MinIO) |
| 4.2 | Teto de upload próprio para foto e lista de tipos só de imagem | Alta | A fazer | hoje o teto é global e a lista herdou PDF e áudio |
| 4.3 | Passo de fotos do cadastro envia por ambiente pelo fluxo multipart | Alta | Feita | escrita e testada no navegador até a escolha, prévia e remoção; **o envio ao bucket não foi exercitado** (sem MinIO), nem o CORS do bucket expondo `ETag` |
| 4.4 | Foto no anúncio e leitura por URL assinada na vitrine | Alta | Feita | `photos[].url` assinada em `listings` e detalhe; o teste com bucket real fica para o CI com MinIO |
| 4.5 | Apagar o objeto do bucket quando o anúncio sai | Média | A fazer | |

## Fase 5 · Dono, verificação e moderação (7/7)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 5.1 | Definir como nasce a conta `OWNER` (cadastro com e-mail ou convite) | Alta | Feita | cadastro aberto, sem confirmação de e-mail até haver provedor (6.x); `DECISIONS.md` #12 |
| 5.2 | Entrada do dono na tela e rota privada com guarda | Alta | Feita | `_authentication` e `_private`, `E2E` em `auth.spec.ts` |
| 5.3 | Área "Meus anúncios" (listar, editar, arquivar) | Alta | Feita | `_private/owner/listings`; a API só adiciona foto, não remove nem reordena |
| 5.4 | Verificação do dono e selo "dono verificado" | Alta | Feita | a equipe marca `users.verified_at`; o selo vem da conta. O critério de verificação (documento, visita, WhatsApp) segue em aberto no `PRD.md` §8 |
| 5.5 | Moderação de anúncio (aprovar, pedir ajuste, arquivar) | Alta | Feita | moderação antes de publicar (`DECISIONS.md` #14); sem apagar de vez, ver 4.5 |
| 5.6 | Política de anúncio parado (prazo sem atualização) | Média | Feita | a tela só mostra "atualizado há X dias"; o prazo para tirar do ar continua pergunta aberta no `PRD.md` §8 e não há rotina que tire anúncio |
| 5.7 | Canal de denúncia de golpe e WhatsApp institucional | Média | Feita | denúncia pública e fila da equipe; **o WhatsApp institucional continua sem número** (`PRD.md` §8) |

## Fase 6 · E-mail e fila (0/3)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 6.1 | Escolher o serviço de e-mail e integrá-lo por contrato (`MailerContract`) | Média | A fazer | |
| 6.2 | Fila com Redis e worker, e segundo serviço no Coolify | Média | A fazer | `ARCHITECTURE.md` §9.1 |
| 6.3 | Confirmação de e-mail e aviso ao dono | Média | A fazer | depende de 5.1, 6.1 e 6.2 |

## Fase 7 · Correções e dívida conhecida (7/15)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 7.1 | Contraste do botão de WhatsApp no tema escuro: token de texto próprio para o `sun` | Alta | Feita | token `--on-sun`, `DESIGN.md` §2 |
| 7.2 | Borda `line` dos campos com 3:1 de contraste | Média | A fazer | 1,31:1 hoje |
| 7.3 | Desabilitar o botão de enviar enquanto o cadastro envia | Média | Feita | `pending` no `Stepper.Nav` |
| 7.4 | Trocar a regra global de `prefers-reduced-motion` por `motion-reduce:` por componente | Baixa | A fazer | `DESIGN.md` §9 |
| 7.5 | Validator do WhatsApp só com dígitos, em `shared/` e no par do backend | Alta | A fazer | hoje só confere o tamanho, `SECURITY.md` TM-008 |
| 7.6 | Origem de `backend/infra/r2-cors.json` alinhada ao app | Alta | Feita | `https://aporta.maiyu.com.br`; falta aplicar no provedor |
| 7.7 | Corrigir o comentário de `vitest.config.ts` (cita um teste de `rich-text` e 229 testes que este projeto não tem) | Baixa | A fazer | o comentário do `.env.example` sobre `VITE_API_URL` já foi corrigido na 3.6 |
| 7.8 | Cabeçalhos de segurança no app (CSP, `Referrer-Policy`, `X-Frame-Options`) | Média | Feita | CSP com nonce por resposta (só em produção), `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` e HSTS sem `includeSubDomains`; `e2e/headers.spec.ts` confere sem violação no console. Falta HSTS com `includeSubDomains` e `preload`, que mexe nos outros subdomínios de `maiyu.com.br` |
| 7.9 | Testes que faltam: `guideSearchSchema`, `listing-draft.validator.ts`, paridade das chaves de i18n | Média | A fazer | `TEST-PLAN.md` §3.1; o `/health-check` do app já é conferido em `e2e/health.spec.ts` |
| 7.10 | Conferir telefones, coordenadas e lugares de exemplo antes de abrir ao público | Alta | Bloqueada | exige o dono e quem conhece a cidade |
| 7.11 | Escrever o procedimento de rotação de `APP_KEY` e das credenciais | Média | A fazer | `SECURITY.md` §6 |
| 7.12 | Favicon, ícones e imagem de compartilhamento (`frontend/public` está vazio e o `head` não aponta imagem) | Média | Feita | favicon, ícones, manifesto e imagem de compartilhamento gerados por `frontend/scripts/generate-icons.mjs` e `generate-og.mjs`; a prévia usa a cena do tipo, não foto |
| 7.13 | Fotos reais da cidade (acervos abertos com crédito, ou fotos do dono) no hero e no guia | Alta | Bloqueada | o inspetor de design reprova página só com ilustração; sem rede nesta sessão para buscar no Openverse e no Wikimedia |
| 7.14 | Passada de design e responsividade: sombras em repouso e réguas finas fora, texto a partir de 13px, título dominante, papel e texto de apoio mais escuros, movimento só em `transform` e `opacity` | Alta | Feita | 9 larguras, de 320 a 1920 px, sem estouro horizontal; E2E com axe nos dois temas |
| 7.15 | A tela do cadastro dizia "Anúncio recebido" com um envio que não gravava nada: trocar o texto por um estado honesto | Alta | Feita | commit `01f86eb`: o stub saiu, o último passo "Finalizar cadastro" só valida o formulário inteiro e mostra "Anúncio pronto", avisa que o envio ainda não está no ar e mantém o rascunho |

## Fase 8 · E2E (1/4)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 8.1 | Playwright no frontend com `e2e/playwright.config.ts` | Alta | Feita | 37 testes de navegador verdes contra o backend semeado: health-check e `GET /storefront/listings` (200, 12 itens, `meta.total` 12), busca, detalhe, guia, cadastro, idiomas, API fora do ar com a página aberta e axe nos dois temas; o job do CI ainda não rodou no GitHub |
| 8.2 | Specs dos fluxos críticos de `USER-FLOWS.md` que dependem da API | Alta | A fazer | os fluxos públicos de leitura já têm spec contra a API real (8.1); faltam os que dependem das fases 4 e 5 |
| 8.3 | Rodar os 42 testes E2E de storage com MinIO | Alta | A fazer | `docker compose up -d` em `backend/` |
| 8.4 | E2E do SSR com a API fora do ar | Média | A fazer | `page.route` só intercepta o navegador, então hoje isso foi conferido à mão com `curl` e `SERVER_API_URL` apontando para uma API morta (`/listings` e o detalhe respondem 500 com a tela "Algo deu errado", `/listings/nao-existe` responde 404); precisa subir o app com a API derrubada de propósito |

## Fase 9 · Deploy e produção (1/9)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 9.1 | Fornecer `COOLIFY_URL`, `COOLIFY_UUID_API` e `COOLIFY_UUID_APP` e conferir os três segredos | Alta | Bloqueada | valores ainda não fornecidos pelo dono, `ENV.md` §6 |
| 9.2 | Subir Node 24 e pnpm 11 no ambiente de desenvolvimento | Média | A fazer | o ambiente desta sessão tinha Node 22 e pnpm 10 |
| 9.3 | Primeiro run do CI no GitHub e correção do que falhar | Alta | A fazer | depende de 8.1 |
| 9.4 | Configurar o painel: migration pós-deploy, `COOKIE_DOMAIN`, `TRUSTED_PROXIES`, `CORS_ORIGINS`, healthcheck em `/health-check` | Alta | A fazer | `ARCHITECTURE.md` §9.1; `CORS_ORIGINS=https://aporta.maiyu.com.br` passou a ser requisito da vitrine, porque o navegador chama a API direto; `SERVER_API_URL` é opcional |
| 9.5 | Aplicar o CORS do bucket e agendar `storages:prune` | Alta | A fazer | depende de 7.6 |
| 9.6 | Primeira conta de administrador em produção | Alta | Feita | `node ace staff:create` cria o primeiro administrador sem seeder (`ENV.md` §8); falta rodá-lo em produção, que é do dono |
| 9.7 | Provisionar o PostgreSQL e o bucket de produção | Alta | A fazer | |
| 9.8 | Conferir os domínios e o smoke test do deploy | Média | A fazer | `aporta.maiyu.com.br` e `api-aporta.maiyu.com.br` |
| 9.9 | Conferir a colisão de nome e de domínio dos cookies de sessão com os outros projetos de `maiyu.com.br` e decidir a correção | Alta | Bloqueada | decisão do dono: `DECISIONS.md` #9, `SECURITY.md` TM-014 |

## Fase 10 · Ideias (fora do escopo atual)

- Favoritos e alerta de novo anúncio: conta de visitante não está no MVP (`PRD.md` §5).
- Tradução do texto do anúncio pelo dono (hoje só a interface tem três idiomas): pergunta aberta.
- Avaliação de imóvel e de dono: fora do MVP.

---

## Como escrever uma tarefa

| Campo | Exemplo |
|---|---|
| Tarefa | Validator do WhatsApp só com dígitos |
| Entradas | número digitado pelo dono, com ou sem máscara |
| Validação | só dígitos, de 10 a 13 |
| Pronta quando | número com letra é recusado no formulário e na API, e há teste para os dois |

Antes de começar, a tarefa tem: um resultado claro, dependências listadas, arquivos
identificados e critério de aceite. Ao terminar: resultado revisado e status atualizado.
