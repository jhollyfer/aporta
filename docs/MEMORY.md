# Memória do projeto

**Aporta** · onde a gente está, para a próxima conversa

> O agente lê **no início** de toda sessão e atualiza **no fim**. Curto: é um ponto de
> retomada, não um diário. Histórico vai para `CHANGELOG.md` e `DECISIONS.md`.

| Atualizado | Fase atual | Progresso | Status |
|---|---|---|---|
| 2026-11-02 | 5 · Dono (conta e entrada feitas; falta a escrita do anúncio e as fotos) | 46% (32 de 69 tarefas) | Pré-MVP: o frontend lê bairros, anúncios e guia da API; o catálogo ainda é o de exemplo semeado no banco |

## Já feito

- Monorepo pnpm com `backend/` (AdonisJS 7), `frontend/` (TanStack Start) e `shared/`.
- Backend genérico: sessão por cookie, conta e perfil, upload multipart assinado em S3 ou MinIO,
  health-check, OpenAPI, guardas de padrão, papéis `ADMINISTRATOR`, `MODERATOR` e `OWNER`.
- Frontend: home, listagem com mapa, detalhe, guia, cadastro do dono em seis etapas com rascunho
  local, três idiomas, tema claro e escuro, kit de componentes e cenas SVG. Home, listagem, detalhe,
  guia e sitemap leem a API pública (`frontend/src/integrations/tanstack-query/`); `lib/data` saiu.
- API pública de leitura em `/storefront` (listagem e detalhe de anúncio por `slug`, bairros e
  guia), com tabelas, entidades, repositories, seeders de desenvolvimento, contrato em `shared/` e
  OpenAPI (`ARCHITECTURE.md` §4 e §5).
- Workflows de CI, imagens e deploy no Coolify escritos.

## Parou em

Branch `feat/conta-cadastro-entrada-dono`, sobre a `main` com a vitrine lendo a API (PR #17). Entrou a
conta do dono: `POST /authentication/sign-up` (papel `OWNER` do caso de uso, 5 por minuto por IP, sem
abrir sessão), cookies com prefixo `aporta-`, CORS expondo `Retry-After`, e no frontend as rotas
`_authentication/{sign-in,sign-up}`, o portão `_private` (`ssr: false`) com `/account`, cabeçalho com
"Entrar" ou "Minha conta", `credentials: 'include'` só nas rotas de conta e renovação única em `401`.
O destino pós-login viaja em `?redirect=` e só aceita caminho interno; recusa devolve
`{ redirect: undefined }` explícito, porque o TanStack Router mescla o retorno do `validateSearch` sobre
a busca crua.

Verificado nesta data: `shared/` e `frontend/` com tipos, lint, Prettier e unitários; backend com `pnpm
check` (232 unitários, guardas de padrão, `validators:check`, `openapi:check`); E2E de navegador
47 de 47 contra o backend semeado (na primeira rodada da sessão a11y do tema claro na home falhou uma
vez e passou isolada e na rodada seguinte: servidor frio, não reproduzido); E2E do backend 242 passam e
42 falham, todos de storage, sem MinIO.

Não verificado: o CI do GitHub nunca rodou; os 42 testes de storage; a imagem Docker; a renovação de
sessão em produção com `COOKIE_DOMAIN` real.

## Próximos passos

1. Mesclar a branch e configurar `CORS_ORIGINS=https://aporta.maiyu.com.br` na API de produção antes do
   deploy do frontend (9.4): sem ela a navegação no cliente não carrega a vitrine.
2. Responder as perguntas abertas do `PRD.md` §8, principalmente quem verifica o dono e a política de
   anúncio parado: elas destravam a moderação (5.4 a 5.6).
3. Conferir o primeiro CI no GitHub (workflows nunca rodaram) e cadastrar os `vars` e segredos do deploy
   (9.1, 9.3).
4. Paginar a listagem e o mapa antes de o catálogo chegar a 100 anúncios (3.9).
5. Fase 4: policy de posse por dono antes de abrir `/storages` ao `OWNER`, depois o upload de fotos e a
   chave de `listing_photos` para `storages`.
6. Rodar os 42 testes de storage com MinIO (8.3) e fornecer as variáveis do Coolify (9.1).
7. Conferir bairros, coordenadas, telefones e lugares de exemplo com o dono antes de abrir ao público
   (7.10).

## Contexto importante

- Os telefones de exemplo usam o prefixo `5597999990` e são fictícios; as coordenadas dos seis
  bairros são aproximadas; os dez lugares do guia são exemplos. Nada disso pode ir a público sem
  conferência (`TASKS.md` 7.10).
- O frontend lê anúncios, bairros e guia da API; sem a API de pé ele só mostra a tela de erro, porque
  não há mais dado local. Para ver anúncios em desenvolvimento, rode `node ace db:seed` no backend. O
  cadastro não envia nada: valida e mostra "Anúncio pronto", e o rascunho segue no aparelho.
- A listagem pede no máximo 100 anúncios (`MAX_PER_PAGE`), e o mapa mostra todos de uma vez (3.9).
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
| A listagem, o sitemap, os bairros e as abas do guia pedem `perPage=100`, o teto da API: passando de 100 registros o excedente some da tela | `frontend/src/integrations/tanstack-query/queries/storefront.ts`, `frontend/src/routes/_public/listings/-search.ts` | paginar (3.9) |
| O SSR com a API fora do ar só foi conferido à mão com `curl`; nenhum E2E o cobre | `frontend/e2e/api-down.spec.ts` cobre só a navegação no cliente | 8.4 |
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
