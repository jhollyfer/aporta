# Segurança

**Aporta** · como avisar de uma falha, o que se protege, de quem, e como

> O modelo de ameaças (§2) é ancorado em evidência: cada fronteira, superfície e abuso aponta um
> caminho do repositório. Revisado quando muda fronteira: rota pública nova, integração, upload,
> papel novo (`_standards/documentation.md` §5). Segredo encontrado no caminho é redigido aqui,
> nunca copiado.
>
> Estado em 2026-11-01: o domínio de anúncios ainda não existe no backend. Onde uma proteção só
> existe como plano, a linha diz "Planejado" e não conta como mitigação pronta.

## 1. Como reportar uma vulnerabilidade

Não abra issue pública. Use o relato privado de vulnerabilidade do GitHub no repositório
`jhollyfer/aporta` (aba Security), se estiver habilitado, com passos para reproduzir. O e-mail de
segurança e o prazo de resposta ainda não foram definidos pelo dono do produto: ficam como pergunta
aberta em `PRD.md` §8 e em `MEMORY.md`.

## 2. Modelo de ameaças

### 2.1 Escopo e premissas

- Dentro: o app público (`frontend/`, SSR em Nitro), a API (`backend/`), o bucket de arquivos, o
  pipeline de deploy (`.github/workflows/`) e o que o visitante envia (URL, formulário, arquivo).
- Fora: o aplicativo e o servidor do WhatsApp, os ladrilhos do OpenStreetMap, o painel do Coolify e
  o provedor do bucket (analisados só pela fronteira com o Aporta).
- Premissas: TLS terminado no proxy (Traefik do Coolify); banco sem acesso público; bucket
  privado. Runtime de produção se separa de CI e de desenvolvimento: o CI usa `APP_KEY` de
  mentira e a senha do administrador de teste nasce por execução.

### 2.2 Componentes, fluxos e fronteiras de confiança

```mermaid
flowchart LR
  user[Navegador] -->|HTTPS| web[App SSR]
  user -->|HTTPS com cookie| api[API]
  user -->|PUT das partes assinadas| bucket[(Bucket S3)]
  web -.->|futuro: consulta de anúncios| api
  api --> db[(PostgreSQL)]
  api -->|assina URLs e confere o objeto| bucket
  user -->|link wa.me| wa[WhatsApp]
  user -->|ladrilhos| osm[OpenStreetMap]
  ci[GitHub Actions] -->|POST com token| coolify[Coolify]
```

| Fronteira | Entre | O que a protege | Evidência |
|---|---|---|---|
| internet para a API | navegador e API | cookie `httpOnly`, lista de origens (CORS), barreira de `Origin` nas escritas, limite de tentativas | `backend/config/session-token.ts`, `backend/config/cors.ts`, `backend/app/middleware/origin.middleware.ts`, `backend/start/limiter.ts` |
| navegador para o bucket | navegador e S3 | URL de parte assinada (1 hora), `Content-Type` fixado na assinatura, bucket privado, CORS restrito à origem do app | `backend/app/services/multipart/multipart.service.ts`, `backend/infra/r2-cors.json` |
| visitante para o app | navegador e SSR | busca validada por Zod com `.catch`, sem segredo no bundle (só `VITE_*`), sem HTML de usuário | `frontend/src/routes/_public/listings/-search.ts`, `frontend/src/env.ts` |
| equipe para a documentação da API | navegador e `/openapi.json`, `/documentation` | só a equipe vê; os demais recebem 404 | `backend/app/middleware/documentation.middleware.ts` |
| papel para o grupo `/storages` | sessão e arquivos | sessão e papel `ADMINISTRATOR` ou `MODERATOR` | `backend/start/routes.ts` |
| CI para o Coolify | GitHub Actions e a instância | `COOLIFY_TOKEN` como segredo, UUIDs e URL em `vars` do repositório | `.github/workflows/main-deploy-coolify.yml` |

### 2.3 Ativos

| Ativo | Por quê importa | C / I / D | Onde fica | Quem acessa |
|---|---|---|---|---|
| Conta e senha da equipe | tomada de conta de moderação deixa publicar ou arquivar anúncio | C, I | senha em hash scrypt na tabela `users` | ninguém lê a senha |
| Sessão (cookie) | quem a tem age como a conta | C | cookie `httpOnly` e hash na tabela `auth_access_tokens` | o próprio navegador |
| WhatsApp, nome e e-mail do dono | dado pessoal (LGPD); número exposto atrai spam e golpe | C | futura tabela de anúncios; hoje, só o `localStorage` do dono e os dados de exemplo (telefones fictícios) | visitante vê o WhatsApp do anúncio publicado, por design; equipe vê o resto |
| Anúncio e selo "dono verificado" | a confiança do produto: selo falso ou anúncio falso é golpe | I | futura tabela de anúncios | dono edita o próprio, equipe modera |
| Fotos dos imóveis | privacidade da casa e prova de que o imóvel existe | C, I | bucket privado, leitura por URL assinada | dono do anúncio, equipe |
| Segredos de deploy | publicar versão adulterada | C, I | segredos e `vars` do repositório; variáveis do painel do Coolify | quem tem acesso ao repositório e ao painel |
| Disponibilidade do site | a decisão de moradia é sazonal (chegada dos calouros, festival) | D | Coolify | todos |

C = confidencialidade, I = integridade, D = disponibilidade.

### 2.4 Atacante

| Pode | Não pode (premissa) |
|---|---|
| chamar qualquer rota pública e mexer na URL de busca | ler o banco ou o bucket diretamente |
| criar conta de dono, quando o cadastro existir, e publicar anúncio falso | interceptar TLS |
| trocar ids na URL e no corpo | forjar o cabeçalho `Origin` de um navegador, nem `Sec-Fetch-Site` |
| coletar todos os WhatsApps publicados | assumir o painel do Coolify ou o GitHub |
| usar computador compartilhado (lan house) depois do dono | escrever no `localStorage` de outro usuário |
| mandar arquivo disfarçado de imagem | enganar a conferência da assinatura do arquivo no servidor |

### 2.5 Superfícies

| Superfície | Como chega | Fronteira | Evidência |
|---|---|---|---|
| entrada da conta | `POST /authentication/sign-in` | internet para a API | `backend/app/features/authentication/session/sign-in/` |
| renovação e saída | `POST /authentication/refresh`, `POST /authentication/sign-out` | internet para a API | `backend/start/routes.ts` |
| perfil | `GET` e `PUT /account` | internet para a API | `backend/app/features/account/profile/` |
| upload e biblioteca | `/storages` e URL assinada de cada parte | navegador para o bucket | `backend/app/features/storage/files/`, `backend/app/services/multipart/` |
| documentação da API | `/openapi.json`, `/documentation` | equipe | `backend/app/middleware/documentation.middleware.ts` |
| busca pública | `/listings` com parâmetros na URL | visitante para o app | `frontend/src/routes/_public/listings/-search.ts` |
| detalhe do anúncio | `/listings/$slug` | visitante para o app | `frontend/src/routes/_public/listings/$slug.tsx` |
| guia | `/guide?category=` | visitante para o app | `frontend/src/routes/_public/guide/-search.ts` |
| cadastro do dono | `/list-your-place` e `localStorage` | navegador | `frontend/src/routes/_public/list-your-place/`, `frontend/src/hooks/use-draft-storage.ts` |
| pin do mapa | HTML do `divIcon` do Leaflet | navegador | `frontend/src/components/common/listing-map/listing-map-canvas.tsx` |
| link de WhatsApp | `wa.me` com o número e a mensagem | navegador para o WhatsApp | `frontend/src/lib/whatsapp.ts` |
| sitemap e robots | `/sitemap.xml`, `/robots.txt` | internet para o app | `frontend/src/lib/sitemap.ts` |
| healthcheck | `GET /health-check` nos dois apps | internet | `backend/app/features/health-check.controller.ts`, `frontend/src/routes/health-check.ts` |

### 2.6 Abusos priorizados

| Id | Abuso | Probabilidade | Impacto | Prioridade | Mitigação | Evidência |
|---|---|---|---|---|---|---|
| TM-001 | Golpe de anúncio: conta de dono publica imóvel que não existe, com foto roubada, para cobrar sinal | alta | alto | alta | Planejado: moderação antes ou depois de publicar, selo "dono verificado", "atualizado há X dias" e canal de denúncia; hoje o anúncio só existe como exemplo | Ainda sem teste (domínio não existe); tela do selo em `frontend/src/components/common/owner-card/owner-card.tsx` |
| TM-002 | Dono lê, altera ou apaga arquivo ou anúncio de outro dono trocando o id | média | alto | alta | `/storages` fechado a `ADMINISTRATOR` e `MODERATOR` até haver policy de posse; anúncio do dono precisa nascer com escopo pela sessão e 404 igual ao inexistente | `backend/start/routes.ts`, `backend/app/middleware/role.middleware.e2e.spec.ts`, `backend/app/policies/storage.policy.unit.spec.ts` |
| TM-003 | Abrir `/storages` ao papel `OWNER` sem policy de posse | média | alto | alta | Regra em `RULES.md` §2: a mudança pede pergunta; a tarefa de fotos precisa entregar a policy antes | `backend/start/routes.ts` |
| TM-004 | Força bruta contra conta da equipe | média | alto | alta | 5 tentativas por minuto por IP e 20 por hora por conta, com bloqueio de 10 minutos; o mesmo orçamento vale para a troca de senha | `backend/start/limiter.ts`, `backend/app/features/authentication/session/sign-in/sign-in.e2e.spec.ts` |
| TM-005 | Escrita forjada por outro site, com o cookie da vítima | média | alto | alta | barreira de `Origin` em todo método que não seja `GET`, `HEAD` ou `OPTIONS`, lista de origens e `Sec-Fetch-Site`; cookie `sameSite` conforme a topologia | `backend/app/middleware/origin.middleware.ts`, `backend/app/middleware/origin.middleware.e2e.spec.ts` |
| TM-006 | Upload malicioso: SVG ou HTML servido do bucket, tipo falso, arquivo enorme | média | alto | alta | lista fechada de tipos sem SVG, tipo e extensão pelo `mimetype` declarado, conferência de assinatura e tamanho no `complete`, teto `UPLOAD_MAX_SIZE`, limite de 60 requisições por hora por usuário | `shared/src/enums/storage-mimetype.ts`, `backend/app/domain/shared/file-signature.value-object.unit.spec.ts`, `backend/app/domain/storage/storage.unit.spec.ts`, `backend/app/features/storage/files/complete/complete.e2e.spec.ts` |
| TM-007 | Injeção de HTML no pin do mapa por texto do dono | média | médio | média | o HTML do pin leva só o preço formatado, nunca texto do dono | `frontend/src/components/common/listing-map/listing-map-canvas.tsx`; sem teste automatizado (lacuna em `TEST-PLAN.md`) |
| TM-008 | Número de WhatsApp malformado ou com texto no link | média | médio | média | o link remove tudo que não é dígito e codifica a mensagem; o formulário só aceita dígitos. O validator de `shared/` só confere o tamanho (10 a 13), sem exigir dígitos: a API precisa recusar caractere não numérico | `frontend/src/lib/whatsapp.ts`, `frontend/src/lib/whatsapp.test.ts`, `shared/src/validators/owner/listings.validator.ts` |
| TM-009 | Coleta em massa dos WhatsApps publicados para spam ou golpe | alta | médio | média | Aceito por desenho (o número é público para o contato direto); Planejado: avaliar proteção quando houver API (limite por IP, não listar o número na resposta de listagem) | decisão em aberto em `MEMORY.md` |
| TM-010 | Rascunho do cadastro (nome e WhatsApp) lido por quem usa o mesmo computador depois | média | médio | média | o rascunho sai do aparelho quando o envio dá certo; chave versionada; mantido só no navegador | `frontend/src/hooks/use-draft-storage.ts`; sem aviso ao dono sobre computador compartilhado (lacuna) |
| TM-011 | Filtro de URL malformado derruba a página ou injeta valor | alta | baixo | baixa | cada campo da busca tem `.catch(undefined)` e o bairro é conferido contra a lista real; o React escapa o texto | `frontend/src/routes/_public/listings/-search.ts`, `frontend/src/routes/_public/listings/-search.test.ts` |
| TM-012 | Segredo ou credencial no repositório ou no CI | média | alto | alta | varredura de segredo em todas as refs, `pnpm audit` em produção, seeder sem senha padrão e só fora de produção, workflows sem `pull_request_target` | `.github/workflows/ci.yml`, `.gitleaks.toml`, `backend/database/seeders/user.seed.ts` |
| TM-013 | Anúncio velho ou já alugado exposto como disponível (engenharia social e perda de confiança) | alta | médio | média | Planejado: política de prazo sem atualização; hoje a tela mostra "atualizado há X dias" | `frontend/src/components/common/owner-card/owner-card.tsx`; política em aberto em `PRD.md` §8 |
| TM-014 | Colisão de cookie com outro projeto da casa: com `COOKIE_DOMAIN=.maiyu.com.br` e os mesmos nomes `access-token` e `refresh-token`, o login em um projeto sobrescreve a sessão do outro, e um projeto recebe o cookie do outro | média | médio | média | Não mitigado. Confirmar em produção e, se colidir, usar nomes de cookie por projeto ou mover a API para um subdomínio do app (decisão do dono, `DECISIONS.md` #9) | `backend/config/session-token.ts`; sem teste |

### 2.7 Calibragem de criticidade

- Crítico: uma conta da equipe tomada, ou arquivo ou anúncio de um dono alterado por outro, ou selo
  de verificação concedido por falha (o produto promete confiança).
- Alto: golpe que passa pela moderação, upload que expõe HTML do bucket, segredo no repositório.
- Médio: número de WhatsApp coletado em massa, dado pessoal no rascunho local.
- Baixo: enumeração de recurso público, filtro de URL inválido.

### 2.8 Para revisão manual

- O frontend não define cabeçalhos de segurança (CSP, `X-Frame-Options`, `Referrer-Policy`) no
  Nitro. A API tem CSP restritiva e HSTS (`backend/config/shield.ts`). O app público pede revisão
  antes do lançamento, principalmente depois que o mapa carregar ladrilhos e a galeria carregar
  fotos de outro domínio.
- A lista de tipos de arquivo herdou PDF e quatro tipos de áudio da fundação. Foto de anúncio só
  precisa de imagem: restringir ao entregar o upload de fotos.
- O teto `UPLOAD_MAX_SIZE` é global (1 GiB no exemplo): foto de anúncio precisa de teto próprio.
- A origem de `backend/infra/r2-cors.json` já é a do app (`https://aporta.maiyu.com.br`); falta aplicar
  o arquivo no provedor do bucket e conferir o `ETag` exposto.
- Conferir em produção a colisão de cookies de sessão com outros projetos do domínio `maiyu.com.br` (TM-014).
- Revisar cada rota de anúncio nova quanto a escopo por sessão, 404 igual ao inexistente e ao dado
  que a listagem pública devolve do dono.

## 3. Autenticação e sessão

- Sessão por par de cookies `httpOnly` (acesso e renovação), com `path` `/`, `secure` em produção e
  `sameSite` calculado entre a origem do app e a URL da API (`lax` ou `none`). O domínio vem de
  `COOKIE_DOMAIN`. Não há fallback para o cabeçalho `Authorization`: o cookie `httpOnly` é o único
  caminho. Evidência: `backend/config/session-token.ts`, `backend/app/guards/cookie-access-tokens.guard.ts`.
- Expiração: acesso de 1 dia e renovação de 7 dias.
- Trocar e-mail, senha ou papel, desativar ou arquivar a conta derruba as sessões abertas
  (`backend/app/domain/user/user.entity.ts`).
- Limite de tentativas no login (por IP e por conta), no `refresh` (60 por minuto por IP) e na troca
  de senha, que gasta o mesmo orçamento do login (`backend/start/limiter.ts`).
- Login responde `401` com a mesma mensagem (`INVALID_CREDENTIALS`) para senha errada e para conta
  inexistente. Recuperação de senha e convite não existem ainda.
- Hash de senha: scrypt (`backend/config/hash.ts`).
- Não existe cadastro de conta. A primeira conta de administrador nasce do seeder, só em
  desenvolvimento e teste, e o seeder para se faltar `SEED_OWNER_PASSWORD`.

## 4. Autorização

- Toda rota autenticada passa por policy (`_standards/backend.md` §4.6); escopo pela sessão
  (`actor`), nunca por id vindo do cliente.
- Recurso de outro dono responde 404, igual ao inexistente. A política de download de arquivo já
  responde assim (`backend/app/policies/storage.policy.ts`).
- Perfis (`ARCHITECTURE.md` §8):

| Perfil | Pode hoje | Não pode |
|---|---|---|
| visitante | ver busca, detalhe, guia, e abrir o WhatsApp | qualquer rota autenticada |
| `OWNER` | ver e editar a própria conta | `/storages` e a documentação da API |
| `MODERATOR` | `/storages`, documentação da API, a própria conta | apagar de vez, gerir contas (regra do papel; ainda sem rotas) |
| `ADMINISTRATOR` | tudo o que a equipe faz e apagar de vez | |

- `/storages` fica fechado à equipe até existir policy de posse por dono (`DECISIONS.md` #2).

## 5. Entrada e saída

- Todo dado de fora passa pelo validator antes de chegar à regra: VineJS na API, com paridade com o
  Zod de `shared/` conferida por `validators:check`; Zod no frontend e na URL.
- Upload: lista fechada de tipos (`shared/src/enums/storage-mimetype.ts`, sem SVG), tamanho fixado na
  assinatura e conferido no `complete`, conferência da assinatura do arquivo, partes de 10 MiB com
  URL de parte assinada de 1 hora de vida, URL de leitura de 15 minutos e URL de download com nome
  original de 5 minutos. Sem varredura de vírus.
- Campo de texto do anúncio tem teto de tamanho (título 80, descrição 600, regras 600, endereço 120).
- Resposta de erro não vaza stack, SQL ou caminho interno (`backend/app/exceptions/handler.e2e.spec.ts`).
- O frontend não renderiza HTML vindo de usuário; o único HTML montado à mão é o do pin do mapa, com
  o preço formatado.

## 6. Segredos

- Só em variável de ambiente (`ENV.md`); nada de segredo no código, log ou `docs/`.
- Segredos do repositório: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `COOLIFY_TOKEN`.
- Rotação: Não definida ainda. `APP_KEY`, credenciais do bucket, do banco e do Coolify não têm
  procedimento escrito de troca, e a troca de `APP_KEY` precisa prever a leitura da chave anterior
  durante a transição. Pendência em `TASKS.md`.

## 7. Dependências

- Versão mais nova publicada (`_standards/tooling.md` §0); CVE corrigido assim que sai.
- `pnpm audit --prod --audit-level=high` e varredura de segredo (gitleaks, em todas as refs) no
  workflow `CI` de pull request; Dependabot semanal para npm, GitHub Actions e Docker
  (`.github/dependabot.yml`). O CI ainda nunca rodou no GitHub.

## 8. Dados pessoais (LGPD)

| Dado | Finalidade | Base legal | Retenção | Exclusão |
|---|---|---|---|---|
| Nome e e-mail da conta | entrar e identificar quem opera ou anuncia | execução de contrato (a confirmar com o dono) | enquanto a conta existir | arquivamento lógico hoje; anonimização em prazo ainda não definida |
| Nome e WhatsApp do dono no anúncio | o visitante falar com o dono | execução de contrato e consentimento do dono ao publicar (a confirmar com o dono) | enquanto o anúncio estiver publicado | definir com a política de anúncio parado (`PRD.md` §8) |
| Rascunho do cadastro | não perder o que foi digitado | consentimento implícito do uso do formulário | no navegador do dono, até o envio ou até o dono limpar os dados do site | apagado no envio com sucesso |
| Foto do imóvel | mostrar o imóvel | execução de contrato | enquanto o anúncio existir | apagar o objeto do bucket junto com o anúncio (a implementar) |

A base legal e os prazos são proposta técnica, não parecer jurídico: o dono do produto confirma
antes do lançamento.

## 9. Checklist de revisão

- [ ] Rota nova tem auth e policy; rota pública nova, integração, upload ou papel atualizou o §2.
- [ ] Nenhum segredo no diff.
- [ ] Entrada validada; saída sem dado de outro usuário e sem WhatsApp além do que o anúncio publica.
- [ ] Log sem senha, token, documento ou outro dado pessoal.
- [ ] Texto do dono nunca vai para HTML montado à mão.
- [ ] Anúncio, foto e arquivo de um dono não aparecem para outro dono.
