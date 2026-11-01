# Backend: instruções para agentes

API da APORTA em AdonisJS 7 + Lucid + PostgreSQL. Vale tudo do `AGENTS.md` da raiz; aqui só o
que muda ao trabalhar em `backend/`.

## Antes de mexer

- Rota, controller, use-case, validator, policy, service ou model: `_standards/backend.md`,
  `_standards/domain.md` e `_standards/architecture.md` §3, pela skill `maiyu-backend`.
- Módulos, tabelas, integrações e papéis deste projeto: `docs/ARCHITECTURE.md` §4 a §8.
- Restrição do produto (soft delete, vitrine, arquivos gerados e commitados): `docs/RULES.md` §3.
- Variável de ambiente: `docs/ENV.md`, no mesmo commit que `.env.example`.
- Teste novo ou rota nova: `docs/TEST-PLAN.md`.
- Sessão, limite de requisição, upload ou rota pública: `docs/SECURITY.md`.
