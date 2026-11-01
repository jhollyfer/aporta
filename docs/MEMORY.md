# Memória do projeto

**Aporta** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual | Progresso | Status |
|---|---|---|---|
| 2026-11-01 18:10 | 3 · Domínio de anúncios no backend (a iniciar) | 27% (17 de 64 tarefas) | Pré-MVP: fundação e frontend com dados de exemplo prontos; sem API de anúncios |

## Já feito

- Monorepo pnpm com `backend/` (AdonisJS 7), `frontend/` (TanStack Start) e `shared/`.
- Backend genérico: sessão por cookie, conta e perfil, upload multipart assinado em S3 ou MinIO,
  health-check, OpenAPI, guardas de padrão, papéis `ADMINISTRATOR`, `MODERATOR` e `OWNER`.
- Frontend com dados de exemplo: home, listagem com mapa, detalhe, guia, cadastro do dono em seis
  etapas com rascunho local, três idiomas, tema claro e escuro, kit de componentes e cenas SVG.
- Workflows de CI, imagens e deploy no Coolify escritos.

## Parou em

A fundação foi mesclada na `main` pelo [PR #1](https://github.com/jhollyfer/aporta/pull/1). O trabalho
seguinte, a passada de design e responsividade do frontend, está na branch
`feat/refino-visual-e-responsividade`. Os doze arquivos de `docs/` foram preenchidos a partir do código
em 2026-11-01. Verificado nesta data: frontend (typecheck, ESLint, Vitest com 34 testes, Prettier,
build, `check-cycles`) e `shared/` (lint, typecheck, 86 testes, build) verdes; backend com lint,
typecheck, `pattern:check`, `authz:check`, `depcruise`, `openapi:check`, `test:unit` (201) e
`di:check` verdes. No E2E do backend, 176 testes passam e os 42 de storage **não foram
verificados** por falta de MinIO. O CI nunca rodou no GitHub. O próximo trabalho é o domínio de
anúncios no backend (`TASKS.md` fase 3). O E2E do frontend (35 testes, com axe nos dois temas e
rolagem horizontal em 320 px) passa contra o build e o backend locais.

## Próximos passos

1. Responder as perguntas abertas do `PRD.md` §8, principalmente quem verifica o dono, a política de
   anúncio parado e como nasce a conta `OWNER`: elas destravam a fase 5.
2. Conferir o primeiro CI no GitHub (workflows nunca rodaram) e cadastrar os `vars` e segredos do deploy
   (9.1). O E2E do frontend existe e passa localmente (`TASKS.md` 8.1).
3. Fase 3: entidade de anúncio, bairros, vitrine pública e `POST` do dono, com o validator VineJS par
   do `OwnerListingCreateValidator`.
4. Trocar `frontend/src/lib/data` por `queryOptions` quando a vitrine existir (3.6).
5. Fase 4: policy de posse por dono antes de abrir `/storages` ao `OWNER`, depois o upload de fotos.
6. Rodar os 42 testes de storage com MinIO (8.3) e fornecer as variáveis do Coolify (9.1).

## Contexto importante

- Os telefones de exemplo usam o prefixo `5597999990` e são fictícios; as coordenadas dos seis
  bairros são aproximadas; os dez lugares do guia são exemplos. Nada disso pode ir a público sem
  conferência (`TASKS.md` 7.10).
- O frontend não chama a API para anúncios, bairros nem guia. `VITE_API_URL` está declarada e
  nenhuma tela a lê. O envio do cadastro é um stub que não grava nada.
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
| A tela do cadastro diz "Anúncio recebido", mas o envio é um stub e nada é gravado | `frontend/src/integrations/tanstack-query/mutations/listings.ts` | trocar o texto por um estado honesto ou tirar a rota do ar até a API existir (7.15) |
| 42 testes E2E de storage sem verificação (sem MinIO neste ambiente) | `backend/app/features/storage/` | subir `docker compose up -d` em `backend/` e rodar `pnpm test:e2e` (8.3) |
| `VITE_API_URL` declarada e nunca lida; o comentário do `.env.example` sugere que ela liga a API | `frontend/src/env.ts`, `frontend/.env.example` | tratar como inativa até a fase 3 (3.6, 7.7) |
| O validator do WhatsApp só confere o tamanho (10 a 13), não exige dígitos | `shared/src/validators/owner/listings.validator.ts` | o campo da tela filtra dígitos; a API precisa recusar o resto (7.5) |
| A borda `line` dos campos tem contraste de 1,31:1 | `frontend/src/styles.css` | revisar contra o limite de 3:1 (7.2) |
| `styles.css` zera animação e transição por regra global de `prefers-reduced-motion` | `frontend/src/styles.css` | trocar por `motion-reduce:` por componente (7.4) |
| `frontend/public` está vazio: sem favicon e sem imagem de compartilhamento | `frontend/public/` | o link no WhatsApp sai sem prévia (7.12) |
| O ambiente de desenvolvimento desta sessão tinha Node 22 e pnpm 10; o projeto pede Node >=24 e pnpm ^11 | `package.json` (`engines`, `devEngines`) | instalar as versões pedidas (9.2) |
| Ainda não há conta `OWNER` por cadastro, entrada do dono na tela, nem primeira conta de administrador em produção | backend e `frontend/src/routes/` | seed só em desenvolvimento e teste (5.1, 9.6) |
| Os cookies `access-token` e `refresh-token` têm o mesmo nome de outros projetos da casa, e `COOKIE_DOMAIN=.maiyu.com.br` os faz visíveis a todos os subdomínios; o login num projeto pode sobrescrever a sessão de outro. Não conferido em produção | `backend/config/session-token.ts`, `DECISIONS.md` #9 | decidir entre nomes de cookie por projeto ou API em subdomínio do app (9.9) |
| `/storages` é só da equipe: o dono não consegue subir foto | `backend/start/routes.ts` | por desenho, até haver policy de posse (4.1) |
| O app não define cabeçalhos de segurança (CSP e semelhantes) | `frontend/src/server.ts` | revisar antes do lançamento (7.8) |
| A lista de tipos de arquivo herdou PDF e áudio da fundação | `shared/src/enums/storage-mimetype.ts` | restringir a imagem ao entregar as fotos (4.2) |

## Links úteis

- Repositório: https://github.com/jhollyfer/aporta · Produção: https://aporta.maiyu.com.br (app) e https://api-aporta.maiyu.com.br (API), ainda sem o primeiro deploy confirmado · Design: Não se aplica, não há arquivo de design externo
