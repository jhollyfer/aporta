# Memória do projeto

**Aporta** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual | Progresso | Status |
|---|---|---|---|
| 2026-11-02 | 3 · Domínio de anúncios no backend (leitura pública feita; faltam a escrita do dono e a ligação do frontend) | 43% (29 de 67 tarefas) | Pré-MVP: a API pública de bairros, anúncios e guia existe, e o frontend ainda lê dados de exemplo |

## Já feito

- Monorepo pnpm com `backend/` (AdonisJS 7), `frontend/` (TanStack Start) e `shared/`.
- Backend genérico: sessão por cookie, conta e perfil, upload multipart assinado em S3 ou MinIO,
  health-check, OpenAPI, guardas de padrão, papéis `ADMINISTRATOR`, `MODERATOR` e `OWNER`.
- Frontend com dados de exemplo: home, listagem com mapa, detalhe, guia, cadastro do dono em seis
  etapas com rascunho local, três idiomas, tema claro e escuro, kit de componentes e cenas SVG.
- API pública de leitura em `/storefront` (listagem e detalhe de anúncio por `slug`, bairros e
  guia), com tabelas, entidades, repositories, seeders de desenvolvimento, contrato em `shared/` e
  OpenAPI (`ARCHITECTURE.md` §4 e §5).
- Workflows de CI, imagens e deploy no Coolify escritos.

## Parou em

Trabalho na branch `feat/anuncios-api-publica`, sobre a `main` com o refino visual mesclado: o
commit `44f5ebe` traz o contrato em `shared/`, o `4692ac0` traz o backend (migrations, domínio,
repositories, as quatro rotas e os seeders). O `01f86eb` e o `255f80e` consertam o cadastro do frontend. Os
documentos de `docs/` foram atualizados para esse estado em 2026-11-02.

Verificado nesta data: `shared/` com 103 testes; backend com 226 testes unitários, `pattern:check`,
`depcruise`, `authz:check`, `validators:check` (10 pares), `openapi:check` (16 de 16 operações) e
`di:check` (28 classes). No E2E do backend, 231 testes passam e 42 falham, todos de storage, porque
este ambiente não tem MinIO. O CI nunca rodou no GitHub.

O frontend ainda lê `frontend/src/lib/data`: nenhuma tela chama a API nova. A ligação (`TASKS.md`
3.6) é o PR seguinte, o PR B. O cadastro (7.15) deixou de fingir envio: o último passo valida o
formulário e diz que o envio ainda não está no ar.

## Próximos passos

1. PR B: trocar `frontend/src/lib/data` por `queryOptions` sobre `/storefront` (3.6), com estados de
   carregando e erro, lendo `VITE_API_URL`.
2. Responder as perguntas abertas do `PRD.md` §8, principalmente quem verifica o dono, a política de
   anúncio parado e como nasce a conta `OWNER`: elas destravam a fase 5 e o `POST` do dono (3.5).
3. Conferir o primeiro CI no GitHub (workflows nunca rodaram) e cadastrar os `vars` e segredos do deploy
   (9.1).
4. Fase 4: policy de posse por dono antes de abrir `/storages` ao `OWNER`, depois o upload de fotos e a
   chave de `listing_photos` para `storages`.
5. Rodar os 42 testes de storage com MinIO (8.3) e fornecer as variáveis do Coolify (9.1).
6. Conferir bairros, coordenadas, telefones e lugares de exemplo com o dono antes de abrir ao público
   (7.10).

## Contexto importante

- Os telefones de exemplo usam o prefixo `5597999990` e são fictícios; as coordenadas dos seis
  bairros são aproximadas; os dez lugares do guia são exemplos. Nada disso pode ir a público sem
  conferência (`TASKS.md` 7.10).
- O frontend não chama a API para anúncios, bairros nem guia. `VITE_API_URL` está declarada e
  nenhuma tela a lê. O cadastro não envia nada: valida e mostra "Anúncio pronto", e o rascunho segue
  no aparelho.
- A API pública devolve o WhatsApp do dono nas duas rotas de anúncio, e `photos[].url` sempre nulo
  (`listing_photos` não aponta para `storages`). Para ver dados nela, rode `node ace db:seed` em
  desenvolvimento: entram 6 bairros, 12 anúncios, 53 fotos (sem arquivo) e 10 lugares.
- O seeder de usuário continua exigindo `SEED_OWNER_PASSWORD`; os de catálogo não rodam em `test`.
- Não há nenhuma foto real: cada ambiente é uma cena SVG desenhada.
- "Owner" em `SEED_OWNER_*` é o dono da plataforma e nada tem a ver com o papel `OWNER`, que é o
  dono do imóvel.
- Não há cadastro de conta nem entrada do dono na tela; o seeder só roda fora de produção, então a
  primeira conta de administrador em produção ainda não tem procedimento.
- Portas locais próprias: Postgres 5435, MinIO 9006 e 9007, app 3000, API 3333.
- Domínios: app em `aporta.maiyu.com.br`, API em `api-aporta.maiyu.com.br`. As variáveis
  `COOLIFY_URL`, `COOLIFY_UUID_API` e `COOLIFY_UUID_APP` ainda não foram fornecidas pelo dono.
- Autor único `Jhollyfer Rodrigues`; branch `tipo/escopo-assunto`, sem nome de agente.
- Contato de segurança, prazo de resposta e orçamento de desempenho ainda não foram definidos pelo
  dono; ficam como perguntas abertas.

## Lições

> Uma linha por correção do dono (`AGENTS.md`, "Modo de trabalho" item 3). Lida no início de toda
> sessão. Lição que vale para todo projeto sobe para a régua e sai daqui.

| Data | Erro | Regra que evita | Vale para |
|---|---|---|---|
| 2026-11-01 | A branch de trabalho nasceu com o prefixo `claude/`, nome de agente | Criar a branch já como `tipo/escopo-assunto` (hoje `feat/fundacao-plataforma-moradia`); branch com prefixo de agente se renomeia antes do push | todo trabalho com git (`_standards/tooling.md` §6) |

## Problemas conhecidos

| Problema | Onde | Contorno |
|---|---|---|
| 42 testes E2E de storage sem verificação (sem MinIO neste ambiente) | `backend/app/features/storage/` | subir `docker compose up -d` em `backend/` e rodar `pnpm test:e2e` (8.3) |
| `VITE_API_URL` declarada e nunca lida; o comentário do `.env.example` sugere que ela liga a API, que já existe mas não é chamada | `frontend/src/env.ts`, `frontend/.env.example` | tratar como inativa até o PR B (3.6, 7.7) |
| O validator do WhatsApp só confere o tamanho (10 a 13), não exige dígitos | `shared/src/validators/owner/listings.validator.ts` | o campo da tela filtra dígitos; a API precisa recusar o resto (7.5) |
| A borda `line` dos campos tem contraste de 1,31:1 | `frontend/src/styles.css` | revisar contra o limite de 3:1 (7.2) |
| `styles.css` zera animação e transição por regra global de `prefers-reduced-motion` | `frontend/src/styles.css` | trocar por `motion-reduce:` por componente (7.4) |
| `frontend/public` está vazio: sem favicon e sem imagem de compartilhamento | `frontend/public/` | o link no WhatsApp sai sem prévia (7.12) |
| O ambiente de desenvolvimento desta sessão tinha Node 22 e pnpm 10; o projeto pede Node >=24 e pnpm ^11 | `package.json` (`engines`, `devEngines`) | instalar as versões pedidas (9.2) |
| Nenhuma rota escreve anúncio: o repository não tem `save` e o catálogo só nasce do seeder de desenvolvimento | `backend/app/repositories/listing/listing.repository.ts`, `backend/database/seeders/` | o `POST` do dono é a 3.5; sem seed, a API responde páginas vazias |
| Ainda não há conta `OWNER` por cadastro, entrada do dono na tela, nem primeira conta de administrador em produção | backend e `frontend/src/routes/` | seed só em desenvolvimento e teste (5.1, 9.6) |
| Os cookies `access-token` e `refresh-token` têm o mesmo nome de outros projetos da casa, e `COOKIE_DOMAIN=.maiyu.com.br` os faz visíveis a todos os subdomínios; o login num projeto pode sobrescrever a sessão de outro. Não conferido em produção | `backend/config/session-token.ts`, `DECISIONS.md` #9 | decidir entre nomes de cookie por projeto ou API em subdomínio do app (9.9) |
| `/storages` é só da equipe: o dono não consegue subir foto | `backend/start/routes.ts` | por desenho, até haver policy de posse (4.1) |
| O app não define cabeçalhos de segurança (CSP e semelhantes) | `frontend/src/server.ts` | revisar antes do lançamento (7.8) |
| A lista de tipos de arquivo herdou PDF e áudio da fundação | `shared/src/enums/storage-mimetype.ts` | restringir a imagem ao entregar as fotos (4.2) |

## Links úteis

- Repositório: https://github.com/jhollyfer/aporta · Produção: https://aporta.maiyu.com.br (app) e https://api-aporta.maiyu.com.br (API), ainda sem o primeiro deploy confirmado · Design: Não se aplica, não há arquivo de design externo
