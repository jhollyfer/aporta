# Tarefas do projeto

**Aporta** · divididas em fases

> Roteiro do projeto. Detalhe de uma feature feita com `tlc-spec-driven` mora em
> o `tasks.md` da feature em `.specs/features/`; aqui a linha aponta para lá.
> Atualiza no mesmo commit em que a tarefa começa ou termina.

**Resumo:** 67 tarefas · 29 feitas · 0 em andamento · 10 bloqueadas · 28 a fazer, atualizado 2026-11-02

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

Telas públicas completas, lendo `frontend/src/lib/data` em vez da API.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 2.1 | Casca pública, tema claro e escuro, três idiomas (165 mensagens por idioma) | Alta | Feita | |
| 2.2 | Home: busca em pílula, categorias por tipo, destaques, confiança, guia e faixa do dono | Alta | Feita | |
| 2.3 | Listagem: filtros na URL, chips, mapa com preço no pin, alternância lista/mapa no celular | Alta | Feita | `DECISIONS.md` #5 |
| 2.4 | Detalhe do imóvel: galeria por ambiente, valores, dono e WhatsApp fixo no celular | Alta | Feita | |
| 2.5 | Guia com quatro abas na URL | Média | Feita | |
| 2.6 | Cadastro do dono em seis etapas com progresso e rascunho local | Alta | Feita | o último passo só valida e diz que o envio não está no ar (7.15); o passo de fotos não envia arquivo |
| 2.7 | Cenas SVG por ambiente no lugar de fotos | Média | Feita | `DECISIONS.md` #6 |
| 2.8 | `sitemap.xml`, `robots.txt`, `/health-check` e `head` por rota | Média | Feita | |
| 2.9 | Dados de exemplo: 12 imóveis, 10 lugares e 6 bairros | Média | Feita | telefones fictícios (`5597999990`) e coordenadas aproximadas, ver 7.10 |

## Fase 3 · Domínio de anúncios no backend (6/8)

A leitura pública entrou (commits `44f5ebe` e `4692ac0`): quatro rotas `GET` em `/storefront`, sem
escrita. Falta o `POST` do dono e a ligação do frontend com a API. Parte dos tipos `Listing`,
`Neighborhood` e `Place` de `shared/src/records/`.

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 3.1 | Entidade de anúncio, migration e repository (valores, inclusos, períodos, dono) | Alta | Feita | só leitura: o contrato `ListingRepository` não tem `save`, e a escrita entra com 3.5; dono denormalizado em `listings` (`DECISIONS.md` #10) |
| 3.2 | Bairros como dado (tabela e consulta pública) | Alta | Feita | `GET /storefront/neighborhoods`; a lista e as coordenadas ainda precisam de conferência com quem conhece a cidade (7.10) |
| 3.3 | Vitrine pública: listar com filtro e paginação, mostrar por `slug` | Alta | Feita | `GET /storefront/listings` e `GET /storefront/listings/:slug`; `ARCHITECTURE.md` §4 |
| 3.4 | Lugares do guia (categoria, evento com data) | Média | Feita | `GET /storefront/places`, filtro `category`; só o evento tem `date` |
| 3.5 | Validator VineJS par do `OwnerListingCreateValidator` e criação do anúncio pelo dono | Alta | A fazer | paridade por `validators:check`; depende de 5.1 para saber quem é o dono |
| 3.6 | Trocar `lib/data` por `queryOptions` nas rotas, com estados de carregando e erro | Alta | A fazer | PR B: o frontend ainda lê `frontend/src/lib/data`; `VITE_API_URL` passa a ser lida; a API não devolve URL de foto, então a cena SVG continua |
| 3.7 | Responses de listagem em `shared/src/responses/` e documento OpenAPI | Média | Feita | `shared/src/responses/storefront/`; `openapi:check` com 16 de 16 operações; a response do `POST` do dono entra com 3.5 |
| 3.8 | E2E do backend e linha na matriz do `TEST-PLAN.md` para cada rota nova | Alta | Feita | as quatro rotas de `/storefront`, `TEST-PLAN.md` §3 e §3.1; o `POST` do dono leva as linhas dele |

## Fase 4 · Fotos dos anúncios (0/5)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 4.1 | Policy de posse por dono nas ações de `/storages` e só então abrir o grupo ao `OWNER` | Alta | A fazer | segurança, `SECURITY.md` TM-002 e TM-003 |
| 4.2 | Teto de upload próprio para foto e lista de tipos só de imagem | Alta | A fazer | hoje o teto é global e a lista herdou PDF e áudio |
| 4.3 | Passo de fotos do cadastro envia por ambiente pelo fluxo multipart | Alta | A fazer | depende de 4.1 e 3.5 |
| 4.4 | Foto no anúncio e leitura por URL assinada na vitrine | Alta | A fazer | depende de 3.3 |
| 4.5 | Apagar o objeto do bucket quando o anúncio sai | Média | A fazer | |

## Fase 5 · Dono, verificação e moderação (0/7)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 5.1 | Definir como nasce a conta `OWNER` (cadastro com e-mail ou convite) | Alta | Bloqueada | pergunta aberta em `PRD.md` §8 |
| 5.2 | Entrada do dono na tela e rota privada com guarda | Alta | A fazer | depende de 5.1 |
| 5.3 | Área "Meus anúncios" (listar, editar, arquivar) | Alta | A fazer | depende de 3.5 e 5.2 |
| 5.4 | Verificação do dono e selo "dono verificado" | Alta | Bloqueada | quem verifica e como: `PRD.md` §8 |
| 5.5 | Moderação de anúncio (aprovar, pedir ajuste, arquivar) | Alta | Bloqueada | antes ou depois de publicar: `PRD.md` §8 |
| 5.6 | Política de anúncio parado (prazo sem atualização) | Média | Bloqueada | `PRD.md` §8 |
| 5.7 | Canal de denúncia de golpe e WhatsApp institucional | Média | Bloqueada | número institucional: `PRD.md` §8 |

## Fase 6 · E-mail e fila (0/3)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 6.1 | Escolher o serviço de e-mail e integrá-lo por contrato (`MailerContract`) | Média | A fazer | |
| 6.2 | Fila com Redis e worker, e segundo serviço no Coolify | Média | A fazer | `ARCHITECTURE.md` §9.1 |
| 6.3 | Confirmação de e-mail e aviso ao dono | Média | A fazer | depende de 5.1, 6.1 e 6.2 |

## Fase 7 · Correções e dívida conhecida (5/15)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 7.1 | Contraste do botão de WhatsApp no tema escuro: token de texto próprio para o `sun` | Alta | Feita | token `--on-sun`, `DESIGN.md` §2 |
| 7.2 | Borda `line` dos campos com 3:1 de contraste | Média | A fazer | 1,31:1 hoje |
| 7.3 | Desabilitar o botão de enviar enquanto o cadastro envia | Média | Feita | `pending` no `Stepper.Nav` |
| 7.4 | Trocar a regra global de `prefers-reduced-motion` por `motion-reduce:` por componente | Baixa | A fazer | `DESIGN.md` §9 |
| 7.5 | Validator do WhatsApp só com dígitos, em `shared/` e no par do backend | Alta | A fazer | hoje só confere o tamanho, `SECURITY.md` TM-008 |
| 7.6 | Origem de `backend/infra/r2-cors.json` alinhada ao app | Alta | Feita | `https://aporta.maiyu.com.br`; falta aplicar no provedor |
| 7.7 | Corrigir o comentário de `VITE_API_URL` no `.env.example` e o de `vitest.config.ts` (cita um teste de `rich-text` e 229 testes que este projeto não tem) | Baixa | A fazer | |
| 7.8 | Cabeçalhos de segurança no app (CSP, `Referrer-Policy`, `X-Frame-Options`) | Média | A fazer | `SECURITY.md` §2.8 |
| 7.9 | Testes que faltam: `guideSearchSchema`, `listing-draft.validator.ts`, `/health-check` do app, paridade das chaves de i18n | Média | A fazer | `TEST-PLAN.md` §3.1 |
| 7.10 | Conferir telefones, coordenadas e lugares de exemplo antes de abrir ao público | Alta | Bloqueada | exige o dono e quem conhece a cidade |
| 7.11 | Escrever o procedimento de rotação de `APP_KEY` e das credenciais | Média | A fazer | `SECURITY.md` §6 |
| 7.12 | Favicon, ícones e imagem de compartilhamento (`frontend/public` está vazio e o `head` não aponta imagem) | Média | A fazer | o link mandado por WhatsApp sai sem prévia |
| 7.13 | Fotos reais da cidade (acervos abertos com crédito, ou fotos do dono) no hero e no guia | Alta | Bloqueada | o inspetor de design reprova página só com ilustração; sem rede nesta sessão para buscar no Openverse e no Wikimedia |
| 7.14 | Passada de design e responsividade: sombras em repouso e réguas finas fora, texto a partir de 13px, título dominante, papel e texto de apoio mais escuros, movimento só em `transform` e `opacity` | Alta | Feita | 9 larguras, de 320 a 1920 px, sem estouro horizontal; E2E com axe nos dois temas |
| 7.15 | A tela do cadastro dizia "Anúncio recebido" com um envio que não gravava nada: trocar o texto por um estado honesto | Alta | Feita | commit `01f86eb`: o stub saiu, o último passo "Finalizar cadastro" só valida o formulário inteiro e mostra "Anúncio pronto", avisa que o envio ainda não está no ar e mantém o rascunho |

## Fase 8 · E2E (1/3)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 8.1 | Playwright no frontend com `e2e/playwright.config.ts` | Alta | Feita | 35 testes verdes localmente (25 s): health-check, busca, detalhe, guia, cadastro, idiomas e axe nos dois temas; o job do CI ainda não rodou no GitHub |
| 8.2 | Specs dos fluxos críticos de `USER-FLOWS.md` que dependem da API | Alta | A fazer | os fluxos públicos com mocks já têm spec (8.1); faltam os que dependem das fases 3 a 5 |
| 8.3 | Rodar os 42 testes E2E de storage com MinIO | Alta | A fazer | `docker compose up -d` em `backend/` |

## Fase 9 · Deploy e produção (0/9)

| # | Tarefa | Prioridade | Status | Notas |
|---|---|---|---|---|
| 9.1 | Fornecer `COOLIFY_URL`, `COOLIFY_UUID_API` e `COOLIFY_UUID_APP` e conferir os três segredos | Alta | Bloqueada | valores ainda não fornecidos pelo dono, `ENV.md` §6 |
| 9.2 | Subir Node 24 e pnpm 11 no ambiente de desenvolvimento | Média | A fazer | o ambiente desta sessão tinha Node 22 e pnpm 10 |
| 9.3 | Primeiro run do CI no GitHub e correção do que falhar | Alta | A fazer | depende de 8.1 |
| 9.4 | Configurar o painel: migration pós-deploy, `COOKIE_DOMAIN`, `TRUSTED_PROXIES`, `CORS_ORIGINS`, healthcheck em `/health-check` | Alta | A fazer | `ARCHITECTURE.md` §9.1 |
| 9.5 | Aplicar o CORS do bucket e agendar `storages:prune` | Alta | A fazer | depende de 7.6 |
| 9.6 | Primeira conta de administrador em produção | Alta | Bloqueada | procedimento ainda não definido: o seeder não roda em produção |
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
