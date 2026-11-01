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
| `TRUSTED_PROXIES` | api | não no schema; **obrigatória em produção atrás do Coolify** | não | proxies em quem `request.ip()` acredita ao ler `X-Forwarded-For` (endereços, CIDR, `loopback`, `linklocal`, `uniquelocal`). Ausente vale só `loopback`: atrás do Traefik todo limite por IP viraria um balde só. Nunca `true` | `172.16.0.0/12` |
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
| `VITE_API_URL` | web | não | não | base da API AdonisJS. **Declarada, mas nenhuma tela a lê hoje**: o frontend usa os dados de `src/lib/data`. O comentário do `.env.example` diz que, sem ela, o frontend usa esses dados, o que hoje vale também com ela. Entra no bundle em tempo de build | `http://localhost:3333` |
| `PORT` | web | não | não | porta do servidor Nitro; o `Dockerfile-production` fixa `3000` | `3000` |
| `E2E_BASE_URL` | e2e | sim, para rodar o E2E | não | o app sob teste; sem default, `e2e/support/env.ts` para dizendo qual falta | `http://localhost:3000` |
| `E2E_API_URL` | e2e | sim, para rodar o E2E | não | a API sob teste, cujo `/health-check` o E2E confere | `http://localhost:3333` |
| `E2E_CHROMIUM_PATH` | e2e | não | não | caminho de um Chromium já instalado, para quem não usa o do `playwright install`; no CI fica vazia | `/opt/pw-browsers/chromium` |

Regras (detalhe em `backend.md` §6):

- Segredo e credencial **não têm default**: o app não sobe sem eles.
- Default inseguro é escrito no comentário do `.env.example`, com o motivo.
- `VITE_*` vai para o navegador: nunca segredo.

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
# TRUSTED_PROXIES=172.16.0.0/12

# Session
# COOKIE_DOMAIN=.example.com

# CORS
# CORS_ORIGINS=https://app.example.com

# Database
DATABASE_URL=postgres://aporta:aporta@localhost:5435/aporta
# DATABASE_SSL=false

# Storage
UPLOAD_MAX_SIZE=1073741824
MINIO_ROOT_USER=aporta-root
MINIO_ROOT_PASSWORD=aporta-root-secret
STORAGE_KEY=aporta
STORAGE_SECRET=aporta-secret
STORAGE_BUCKET=aporta
STORAGE_ENDPOINT=http://localhost:9006
STORAGE_FORCE_PATH_STYLE=true

# Seeding
SEED_OWNER_EMAIL=administrator@mail.com
SEED_OWNER_PASSWORD=
```

`frontend/.env.example`:

```dotenv
VITE_SITE_URL=http://localhost:3000
# VITE_API_URL=http://localhost:3333
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
| Desenvolvimento | `backend/.env` copiado de `backend/.env.example`; `frontend/.env` se precisar mudar a URL do site | localhost, chaves de dev; CORS aberto |
| Teste | `backend/.env.test` (versionado) | banco `aporta_test` e bucket `aporta-test` descartáveis |
| CI | `env` de cada passo do workflow | `APP_KEY` de mentira; a senha do administrador de teste nasce por execução, mascarada no log |
| Produção, API | painel do Coolify | `COOKIE_DOMAIN`, `TRUSTED_PROXIES`, `CORS_ORIGINS`, banco e bucket reais; nunca em arquivo no servidor de build |
| Produção, app | `VITE_*` no passo de build do workflow (`main-check-frontend.yml`); `PORT` do Dockerfile | `VITE_SITE_URL=https://aporta.maiyu.com.br` e `VITE_API_URL=https://api-aporta.maiyu.com.br` estão escritos no workflow, então trocar o domínio exige alterar o workflow |

## 5. Primeira configuração

- [ ] `cp backend/.env.example backend/.env`
- [ ] Gerar `APP_KEY` com `node ace generate:key` (dentro de `backend/`) e definir `SEED_OWNER_PASSWORD`.
- [ ] Subir os serviços locais: `docker compose up -d` em `backend/` (Postgres na 5435, MinIO na 9006 e 9007).
- [ ] Criar o banco de teste uma vez: `docker compose exec database createdb -U aporta aporta_test`.
- [ ] Rodar `node ace migration:fresh --seed` para criar as tabelas e o primeiro administrador.
- [ ] Rodar o app (`pnpm dev` na raiz): ele valida as variáveis no boot e para se faltar alguma.
- [ ] Reiniciar o app depois de mudar o `.env`.

## 6. Variáveis do repositório e do CI

| Nome | Tipo | Quem usa | O que é | Estado |
|---|---|---|---|---|
| `DOCKERHUB_USERNAME` | segredo do repositório | workflows de imagem | conta do Docker Hub; as imagens são `aporta-api` e `aporta-app` | a configurar pelo dono |
| `DOCKERHUB_TOKEN` | segredo do repositório | workflows de imagem | token de publicação | a configurar pelo dono |
| `COOLIFY_TOKEN` | segredo do repositório | `main-deploy-coolify.yml` | token da API do Coolify | a configurar pelo dono |
| `COOLIFY_URL` | variável (`vars`) do repositório | `main-deploy-coolify.yml` | endereço da API de deploy da instância | **valor ainda não fornecido pelo dono** |
| `COOLIFY_UUID_API` | variável (`vars`) do repositório | `main-deploy-coolify.yml` | UUID da aplicação da API no Coolify (o da aplicação, não o da instância) | **valor ainda não fornecido pelo dono** |
| `COOLIFY_UUID_APP` | variável (`vars`) do repositório | `main-deploy-coolify.yml` | UUID da aplicação do app | **valor ainda não fornecido pelo dono** |

Os três segredos aparecem nos workflows, mas esta sessão não consegue conferir se estão cadastrados
no GitHub. O smoke test depois do deploy confere `https://api-aporta.maiyu.com.br/health-check` e
`https://aporta.maiyu.com.br/revision.txt` com o SHA do commit.

## 7. Portas locais

| Serviço | Porta | Por quê esta e não a padrão |
|---|---|---|
| Postgres do Aporta | 5435 | `simple-hub` usa 5432, `adacaibs` 5433 e `academy` 5434 na mesma máquina |
| MinIO, API S3 | 9006 | `simple-hub` usa 9000 e 9001, `adacaibs` 9002 e 9003, `academy` 9004 e 9005 |
| MinIO, console | 9007 | idem |
| API | 3333 | padrão do projeto |
| Frontend (`pnpm dev`) | 3000 | padrão do projeto |
| Redis | não se aplica | o projeto não usa Redis (o `academy` ocupa a 6382 na mesma máquina) |
