# Configuração de ambiente

**Aporta** · variáveis que o app precisa para rodar, local e em produção

> Exemplo e documentação usam placeholder; segredo real fica fora do Git.
> Variável nova entra aqui **e** em `.env.example` no mesmo commit. Quem valida é o schema do
> leitor de ENV (`backend/start/env.ts` e `frontend/src/env.ts`, `_standards/backend.md` §6); este
> arquivo explica.

## 1. Variáveis

Mesma ordem de blocos do `backend/.env.example` (`backend.md` §6). "Obrigatória" é o que derruba o
boot quando falta, conforme o schema.

### API (`backend/`)

| Variável | App | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|---|
| `NODE_ENV` | api | sim | não | ambiente de execução (`development`, `production`, `test`) | `development` |
| `PORT` | api | sim | não | porta HTTP da API | `3333` |
| `HOST` | api | sim | não | endereço de escuta; em container, `0.0.0.0`, porque `localhost` só aceita conexão de dentro do container | `localhost` |
| `TZ` | api | não | não | fuso do processo; `UTC` em todo ambiente, para a mesma consulta dar a mesma data em qualquer máquina | `UTC` |
| `LOG_LEVEL` | api | sim | não | nível de log | `info` |
| `APP_KEY` | api | sim | **sim** | chave de cifra da aplicação, sem default | defina com `node ace generate:key` |
| `APP_SERVER_URL` | api | sim | não | endereço público da API | `http://localhost:3333` |
| `TRUSTED_PROXIES` | api | não no schema; **obrigatória em produção atrás do Coolify** | não | proxies em quem `request.ip()` acredita ao ler `X-Forwarded-For` (endereços, CIDR, `loopback`, `linklocal`, `uniquelocal`). Ausente vale só `loopback`: atrás do Traefik todo limite por IP viraria um balde só. Nunca `true` | `uniquelocal` |
| `COOKIE_DOMAIN` | api | não no schema; **obrigatória em produção** (app e API em hosts diferentes) | não | `Domain` dos cookies de sessão. Vazia em desenvolvimento, porque cookie ignora porta. Sem ela em produção o SSR do app nunca recebe o cookie e todo F5 em rota privada desloga | `.maiyu.com.br` |
| `CORS_ORIGINS` | api | não no schema; **obrigatória em produção** | não | origens do navegador autorizadas, separadas por vírgula. Em desenvolvimento a API aceita qualquer origem; fora dele, ausente é lista vazia e recusa toda chamada de outra origem. Nunca `*`: a API usa cookie. A barreira de `Origin` das escritas usa a mesma lista | `https://aporta.maiyu.com.br` |
| `DATABASE_URL` | api | sim | **sim** | conexão com o PostgreSQL | `postgres://aporta:aporta@localhost:5435/aporta` |
| `DATABASE_SSL` | api | não | não | TLS na conexão. **Ausente é TLS desligado.** Banco na rede privada da aplicação costuma não falar TLS; banco gerenciado, fora dela, exige `true` | `false` |
| `UPLOAD_MAX_SIZE` | api | sim | não | teto por arquivo, em bytes, sem default no código. Hoje 1 GiB no exemplo; foto de anúncio precisa de teto próprio (`PRD.md` §8) | `1073741824` |
| `STORAGE_KEY` | api | sim | **sim** | usuário de escopo mínimo do bucket (criado pelo `minio-setup` no local) | `aporta` |
| `STORAGE_SECRET` | api | sim | **sim** | senha desse usuário | `aporta-secret` (só local) |
| `STORAGE_BUCKET` | api | sim | não | nome do bucket, privado | `aporta` |
| `STORAGE_ENDPOINT` | api | sim | não | endereço da API S3: MinIO local, ou S3, R2 ou Spaces em produção | `http://localhost:9006` |
| `STORAGE_FORCE_PATH_STYLE` | api | não | não | `true` para MinIO, que só serve `endpoint/bucket/chave`; em produção (R2, S3, Spaces), remover | `true` |
| `SEED_OWNER_EMAIL` | api | não | não | e-mail do primeiro administrador criado pelo seeder; "owner" aqui é o dono da plataforma, não o papel `OWNER` | `administrator@mail.com` |
| `E2E_OWNER_PASSWORD` | e2e | não | **sim** | a mesma senha do seed: o E2E entra com ela como administrador, como dono de exemplo e como a moderadora semeada (`moderador.exemplo@aporta.example`). No CI nasce por rodada, mascarada | a mesma de `SEED_OWNER_PASSWORD` |
| `SEED_OWNER_PASSWORD` | api | não (o seeder, rodado à mão, exige) | **sim** | senha do primeiro administrador. Sem default: sem ela o seeder para, para não criar conta com credencial conhecida. O seeder roda só em desenvolvimento e teste | defina um valor forte |

### Só do `docker compose` local (`backend/docker-compose.yml`)

| Variável | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|
| `MINIO_ROOT_USER` | sim, para o MinIO local subir | **sim** | usuário root do MinIO; serve só ao setup e ao console, a aplicação não o usa | `aporta-root` |
| `MINIO_ROOT_PASSWORD` | sim, para o MinIO local subir | **sim** | senha do root | `aporta-root-secret` (só local) |
| `DB_PORT` | não | não | porta publicada do Postgres | padrão `5435` |
| `STORAGE_PORT` | não | não | porta publicada da API do MinIO | padrão `9006` |
| `STORAGE_CONSOLE_PORT` | não | não | porta publicada do console do MinIO | padrão `9007` |

### Frontend (`frontend/`)

| Variável | App | Obrigatória | Segredo | O que é | Exemplo |
|---|---|---|---|---|---|
| `VITE_SITE_URL` | web | não (tem default local) | não | endereço público do site, sem barra no fim; vira canônico, sitemap e `og:url`. Entra no bundle em tempo de build | `http://localhost:3000` |
| `VITE_API_URL` | web | **sim** (`z.url()`, sem default) | não | base da API AdonisJS, sem barra no fim. O navegador chama a API direto a partir dela, e o SSR a usa quando `SERVER_API_URL` não existe. Sem ela o frontend não sobe: não há mais dado de exemplo para cair. Entra no bundle em tempo de build | `http://localhost:3333` |
| `STORAGE_PUBLIC_URL` | web | não | não | origem pública do bucket (esquema e host, sem barra), só do servidor de SSR. Entra em `img-src` e `connect-src` do CSP: as fotos assinadas e o envio em partes vão direto ao bucket. Sem ela o navegador bloqueia a foto real | `https://<conta>.r2.cloudflarestorage.com` |
| `SERVER_API_URL` | web | não | não | endereço da API visto só pelo servidor de SSR, pela rede interna do Coolify, para o pedido não sair para a internet e voltar. Sem o prefixo `VITE_` de propósito: nunca entra no bundle. Ausente, o servidor usa `VITE_API_URL`. Lida de `process.env` em tempo de execução. O sitemap também a usa | `http://api:3333` |
| `VITE_UPLOAD_MAX_SIZE` | web | não | não | espelho do `UPLOAD_MAX_SIZE` da API (mesmo valor, em bytes). Ausente, o cliente não recusa por tamanho e o `422` do servidor diz o limite. Entra no bundle em tempo de build | `1073741824` |
| `PORT` | web | não | não | porta do servidor Nitro; o `Dockerfile-production` fixa `3000` | `3000` |
| `E2E_BASE_URL` | e2e | sim, para rodar o E2E | não | o app sob teste; sem default, `e2e/support/env.ts` para dizendo qual falta | `http://localhost:3000` |
| `E2E_API_URL` | e2e | sim, para rodar o E2E | não | a API sob teste, cujo `/health-check` o E2E confere | `http://localhost:3333` |
| `E2E_OWNER_EMAIL` | e2e | sim, para rodar o E2E | não | a conta do `auth.setup.ts`: a do seeder (`SEED_OWNER_EMAIL`) | `administrator@mail.com` |
| `E2E_SHOTS_DIR` | e2e | não | não | pasta fora do repositório onde o spec responsivo grava uma captura de página inteira por tela e viewport; ausente, não grava | `/tmp/shots` |
| `E2E_CHROMIUM_PATH` | e2e | não | não | caminho de um Chromium já instalado, para quem não usa o do `playwright install`; no CI fica vazia | `/opt/pw-browsers/chromium` |

Regras (detalhe em `backend.md` §6):

- Segredo e credencial **não têm default**: o app não sobe sem eles.
- Default inseguro é escrito no comentário do `.env.example`, com o motivo.
- `VITE_*` vai para o navegador: nunca segredo.
- `VITE_API_URL` sem valor derruba o boot do frontend. O Vitest define `test.env.VITE_API_URL` em
  `frontend/vitest.config.ts` para os módulos que importam `env.ts` não lançarem; nenhum teste de
  unidade faz rede.

## 2. Exemplo

`backend/.env.example` é o arquivo versionado, só com valor de desenvolvimento local ou vazio. O
resumo dos blocos, na ordem:

```dotenv
# Node
NODE_ENV=development
PORT=3333
HOST=localhost
TZ=UTC

# App
LOG_LEVEL=info
APP_KEY=
APP_SERVER_URL=http://${HOST}:${PORT}
# TRUSTED_PROXIES=uniquelocal

# Session
# COOKIE_DOMAIN=.example.com

# CORS
# CORS_ORIGINS=https://app.example.com

# Database
DATABASE_URL=postgres://aporta:aporta@localhost:5435/aporta
# DATABASE_SSL=false

# Storage
UPLOAD_MAX_SIZE=1073741824
STORAGE_KEY=aporta
STORAGE_SECRET=aporta-secret
STORAGE_BUCKET=aporta
STORAGE_ENDPOINT=http://localhost:9006
STORAGE_FORCE_PATH_STYLE=true

# Seeding
SEED_OWNER_EMAIL=administrator@mail.com
SEED_OWNER_PASSWORD=

# --- optional: compose-minio ---   (MINIO_ROOT_USER, MINIO_ROOT_PASSWORD)
# --- optional: compose-ports ---   (DB_PORT=5435, STORAGE_PORT=9006, STORAGE_CONSOLE_PORT=9007)
```

O arquivo segue o modelo único da casa (`_templates/backend/.env.example`, `backend.md` §6): mesmas
chaves, ordem, blocos e comentários em todo projeto; só o valor de exemplo é do Aporta. Os blocos
opcionais `client-url`, `mail`, `queue` e `jwt` ficam de fora inteiros, porque o projeto não tem
esses recursos; `compose-minio` e `compose-ports` entram inteiros. O `sync-to-project.mjs --check`
reprova chave a mais, a menos ou fora de ordem (`DECISIONS.md` #271 da régua).

`frontend/.env.example`:

```dotenv
VITE_API_URL=http://localhost:3333
# SERVER_API_URL=http://api:3333
# STORAGE_PUBLIC_URL=http://localhost:9006
VITE_SITE_URL=http://localhost:3000
VITE_UPLOAD_MAX_SIZE=1073741824
# E2E_BASE_URL, E2E_API_URL, E2E_OWNER_EMAIL, E2E_OWNER_PASSWORD, E2E_SHOTS_DIR (comentadas)
```

## 3. Segredo fora do Git

`.gitignore` da raiz:

```gitignore
.env
.env.local
.env.*.local
```

`backend/.env.example` e `backend/.env.test` ficam versionados: o primeiro só com exemplo, o segundo
só com container local e senha de banco de teste (banco separado `aporta_test` e bucket
`aporta-test`, `UPLOAD_MAX_SIZE` de 16 GiB só para declarar tamanhos grandes sem transferi-los).

## 4. Por ambiente

| Ambiente | De onde vêm os valores | Observação |
|---|---|---|
| Desenvolvimento | `backend/.env` copiado de `backend/.env.example`; `frontend/.env` copiado de `frontend/.env.example` (`VITE_API_URL` é obrigatória) | localhost, chaves de dev; a API aceita qualquer origem (`NODE_ENV=development`), então `CORS_ORIGINS` não é preciso |
| Teste | `backend/.env.test` (versionado) | banco `aporta_test` e bucket `aporta-test` descartáveis |
| CI | `env` de cada passo do workflow | o Playwright roda só no pull request, em um job e um banco por projeto de viewport (`mobile`, `tablet`, `desktop`), em paralelo ao `check`; `APP_KEY` de mentira; a senha do administrador de teste nasce por execução, mascarada no log. No job de check do frontend o build leva `VITE_API_URL=https://api-aporta.maiyu.com.br`; no job de E2E o build leva `VITE_API_URL=http://localhost:3333`, a API do próprio job, que roda em desenvolvimento e por isso dispensa `CORS_ORIGINS` |
| Produção, API | painel do Coolify | `COOKIE_DOMAIN`, `TRUSTED_PROXIES`, banco e bucket reais; nunca em arquivo no servidor de build. `CORS_ORIGINS=https://aporta.maiyu.com.br` é obrigatória: o navegador chama `/storefront` direto na navegação do cliente, e sem a origem na lista a vitrine só carrega no primeiro acesso (SSR) |
| Produção, app | `VITE_*` no passo de build do workflow (`main-check-frontend.yml`); `PORT` do Dockerfile; `SERVER_API_URL` opcional no painel, em tempo de execução | `VITE_SITE_URL=https://aporta.maiyu.com.br` e `VITE_API_URL=https://api-aporta.maiyu.com.br` estão escritos no workflow, então trocar o domínio exige alterar o workflow. `SERVER_API_URL` não está configurada em lugar nenhum do repositório: sem ela o SSR usa o endereço público |

## 5. Primeira configuração

- [ ] `cp backend/.env.example backend/.env` e `cp frontend/.env.example frontend/.env`.
- [ ] Gerar `APP_KEY` com `node ace generate:key` (dentro de `backend/`) e definir `SEED_OWNER_PASSWORD`.
- [ ] Subir os serviços locais: `docker compose up -d` em `backend/` (Postgres na 5435, MinIO na 9006 e 9007).
- [ ] Criar o banco de teste uma vez: `docker compose exec database createdb -U aporta aporta_test`.
- [ ] Rodar `node ace migration:fresh --seed` para criar as tabelas e o primeiro administrador.
- [ ] Rodar o app (`pnpm dev` na raiz): ele valida as variáveis no boot e para se faltar alguma.
- [ ] Reiniciar o app depois de mudar o `.env`.

## 6. Segredos do repositório e do CI

Nome fixo em todo projeto da casa (`_standards/tooling.md` §8.3, `DECISIONS.md` #272 da régua). Todos
são **secrets** do GitHub Actions; endereço e UUID nunca ficam escritos no workflow, nem como `vars`.

| Nome | Quem usa | O que é | Estado |
|---|---|---|---|
| `DOCKERHUB_USERNAME` | workflows de imagem | conta do Docker Hub; as imagens são `aporta-api` e `aporta-app` | a configurar pelo dono |
| `DOCKERHUB_TOKEN` | workflows de imagem | access token do Docker Hub, com escrita | a configurar pelo dono |
| `COOLIFY_URL` | `main-deploy-coolify.yml` | base do **painel** do Coolify, sem caminho (`https://coolify.<domínio>`); o workflow monta `${COOLIFY_URL%/}/api/v1/deploy` | **valor ainda não fornecido pelo dono** |
| `COOLIFY_TOKEN` | `main-deploy-coolify.yml` | token de API do Coolify, com permissão de deploy | a configurar pelo dono |
| `COOLIFY_API_UUID` | `main-deploy-coolify.yml` | UUID da aplicação da API (o da aplicação, não o da instância; fim da URL da aplicação no painel) | **valor ainda não fornecido pelo dono** |
| `COOLIFY_APP_UUID` | `main-deploy-coolify.yml` | UUID da aplicação do frontend | **valor ainda não fornecido pelo dono** |

O `main.yml` repassa cada um ao workflow reutilizável, que os declara `required`. O passo de deploy
tira espaço e quebra de linha de cada valor, reprova nomeando o secret vazio e `COOLIFY_URL` que traga
caminho (`/api`), dispara por `POST` e, fora de 2xx, imprime o status e os primeiros 300 caracteres do
corpo; a resposta precisa trazer `deployment_uuid` (`tooling.md` §8.3, `DECISIONS.md` #274 da régua).
Os nomes antigos `COOLIFY_UUID_API` e `COOLIFY_UUID_APP` (que eram `vars`) deixam de ser lidos e podem
ser apagados do repositório.

Esta sessão não consegue conferir se os secrets estão cadastrados no GitHub. O smoke test depois do
deploy confere `https://api-aporta.maiyu.com.br/health-check` e `https://aporta.maiyu.com.br/revision.txt`
com o SHA do commit.

## 7. Portas locais

| Serviço | Porta | Por quê esta e não a padrão |
|---|---|---|
| Postgres do Aporta | 5435 | `simple-hub` usa 5432, `adacaibs` 5433 e `academy` 5434 na mesma máquina |
| MinIO, API S3 | 9006 | `simple-hub` usa 9000 e 9001, `adacaibs` 9002 e 9003, `academy` 9004 e 9005 |
| MinIO, console | 9007 | idem |
| API | 3333 | padrão do projeto |
| Frontend (`pnpm dev`) | 3000 | padrão do projeto |
| Redis | não se aplica | o projeto não usa Redis (o `academy` ocupa a 6382 na mesma máquina) |

## 8. Primeira conta da equipe em produção

O seeder não roda em produção (`DECISIONS.md` #11). A primeira conta nasce pelo comando, uma vez, no
terminal da API no Coolify:

```bash
node ace staff:create --email=equipe@exemplo.com --name="Nome da pessoa" --role=ADMINISTRATOR
```

`--role` aceita `ADMINISTRATOR` (padrão) e `MODERATOR`; `OWNER` é recusado. E-mail já existente, mesmo
arquivado, é recusado. A senha segue a política do cadastro. Não existe variável de ambiente para o comando (o catálogo de
`backend.md` §6.2 não tem `STAFF_*`): e-mail e nome vão nas flags `--email` e `--name` (ou o comando
pergunta) e a senha **só** por prompt oculto, pedida duas vezes, para nunca ficar no histórico do
shell nem em variável de ambiente.

## 9. Lista de entrega do deploy (só o dono faz)

Nada abaixo pode ser feito pelo repositório. O estado de cada item está em `TASKS.md`, fase 9.

- [ ] GitHub, secrets (§6): `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `COOLIFY_URL`, `COOLIFY_TOKEN`,
      `COOLIFY_API_UUID`, `COOLIFY_APP_UUID`.
- [ ] Coolify: duas aplicações, API em `api-aporta.maiyu.com.br` e app em `aporta.maiyu.com.br`.
- [ ] API: `DATABASE_URL`, bucket (`STORAGE_*`), `APP_KEY` nova, `CORS_ORIGINS=https://aporta.maiyu.com.br`,
      `COOKIE_DOMAIN=.maiyu.com.br`, `TRUSTED_PROXIES` cobrindo o Traefik **e a rede do app**.
- [ ] API: comando pós-deploy `node ace migration:run --force`.
- [ ] App: `SERVER_API_URL` (rede interna) e `STORAGE_PUBLIC_URL` (origem do bucket).
- [ ] Healthcheck das duas aplicações em `/health-check`.
- [ ] Bucket: aplicar `backend/infra/r2-cors.json` e expor o cabeçalho `ETag`.
- [ ] Agendar `node ace storages:prune`.
- [ ] Rodar `node ace staff:create` no terminal da API (a senha vai por prompt, nunca por variável).
- [ ] Trocar o catálogo de exemplo: telefones, bairros, coordenadas e lugares reais (`TASKS.md` 7.10).
- [ ] Decidir o HSTS com `includeSubDomains` e `preload` e a colisão de cookies (`DECISIONS.md` #9).
- [ ] Conferir no primeiro run do CI e no smoke test do deploy.
